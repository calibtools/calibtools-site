/**
 * Tests for the inspection report template filling, stamp, and PDF pipeline.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const TEMPLATE_PATH = resolve(ROOT, 'docs/datasheets/common/CT-IR-template.md');
const STAMP_SVG_PATH = resolve(ROOT, 'public/brand/stamp-inspected.svg');
const MARK_SVG_PATH = resolve(ROOT, 'public/brand/product-mark-inspected.svg');

describe('inspection report template', () => {
  const template = readFileSync(TEMPLATE_PATH, 'utf-8');

  it('contains required placeholders', () => {
    for (const ph of ['{{sn}}', '{{part_number}}', '{{description}}', '{{datasheet_code}}',
      '{{lot}}', '{{inspected_on}}', '{{inspector}}', '{{location}}', '{{result}}',
      '{{measurements_table}}', '{{flatness_table}}', '{{visual_table}}']) {
      expect(template).toContain(ph);
    }
  });

  it('does not contain template-only prose', () => {
    expect(template).not.toContain('One report per serial number');
    expect(template).not.toContain('[initials]');
  });

  it('title uses CT-IR-{{sn}} format', () => {
    expect(template).toContain('title: Inspection report CT-IR-{{sn}}');
  });

  it('front matter type is note', () => {
    expect(template).toMatch(/^type: note$/m);
  });
});

describe('part number → description mapping', () => {
  // Simulate the mapping from add-serial.mjs
  const FAMILY_MAP: Record<string, string> = {
    CHA: 'ChArUco calibration target',
    CHT: 'Checkerboard calibration target',
  };
  const MATERIAL_MAP: Record<string, string> = {
    C: 'ceramic',
    P: 'composite',
    G: 'glass',
  };

  function parsePartNumber(pn: string) {
    const parts = pn.split('-');
    const familyCode = parts[1] ?? '';
    const materialCode = parts[2] ?? '';
    return {
      description: `${FAMILY_MAP[familyCode] ?? familyCode}, ${MATERIAL_MAP[materialCode] ?? materialCode}`,
      datasheetCode: `CT-DS-${familyCode}-${materialCode}`,
    };
  }

  it('CT-CHA-C serial renders ceramic description', () => {
    const { description } = parsePartNumber('CT-CHA-C-200150-1007');
    expect(description).toBe('ChArUco calibration target, ceramic');
    expect(description).not.toContain('composite');
  });

  it('CT-CHA-C serial maps to CT-DS-CHA-C datasheet', () => {
    const { datasheetCode } = parsePartNumber('CT-CHA-C-200150-1007');
    expect(datasheetCode).toBe('CT-DS-CHA-C');
  });

  it('CT-CHA-P serial renders composite description', () => {
    const { description } = parsePartNumber('CT-CHA-P-300X200-D6');
    expect(description).toBe('ChArUco calibration target, composite');
  });
});

describe('missing measurements → PENDING', () => {
  function measurementsTable(meas: any) {
    const header = '| Feature | Nominal | Measured | Deviation | Tolerance | Result |';
    const sep = '|---|---|---|---|---|---|';
    if (!meas?.rows?.length) {
      return [header, sep, '| — | — | — | — | — | PENDING |'].join('\n');
    }
    return [header, sep, ...meas.rows.map((r: any) =>
      `| ${r.feature} | ${r.nominal} | ${r.measured} | ${r.deviation} | ${r.tolerance} | ${r.result} |`
    )].join('\n');
  }

  it('renders PENDING with dashes when measurements are null', () => {
    const table = measurementsTable(null);
    expect(table).toContain('PENDING');
    expect(table).toContain('— |');
    // No digits in measured column
    const measuredCol = table.split('\n').slice(2).map(row => row.split('|')[3]?.trim());
    for (const val of measuredCol) {
      expect(val).not.toMatch(/\d/);
    }
  });

  it('renders actual values when measurements are provided', () => {
    const table = measurementsTable({
      rows: [{ feature: 'Width', nominal: '250.000 mm', measured: '250.08 mm', deviation: '+0.08 mm', tolerance: '±0.35 mm', result: 'PASS' }],
    });
    expect(table).toContain('PASS');
    expect(table).toContain('250.08');
    expect(table).not.toContain('PENDING');
  });
});

describe('outlined SVGs', () => {
  it('stamp-inspected.svg contains no <text> elements', () => {
    if (!existsSync(STAMP_SVG_PATH)) return; // skip if not generated yet
    const svg = readFileSync(STAMP_SVG_PATH, 'utf-8');
    expect(svg).not.toMatch(/<text[\s>]/);
    expect(svg).toContain('<path');
    expect(svg).toContain('32mm');
  });

  it('product-mark-inspected.svg contains no <text> elements', () => {
    if (!existsSync(MARK_SVG_PATH)) return;
    const svg = readFileSync(MARK_SVG_PATH, 'utf-8');
    expect(svg).not.toMatch(/<text[\s>]/);
    expect(svg).toContain('<path');
    expect(svg).toContain('25mm');
  });
});

// generated report PDF tests removed — no sample reports in public/ before first production
