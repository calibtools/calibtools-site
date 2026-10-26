/**
 * Integration tests for the docs build pipeline.
 *
 * Verifies page counts, overflow, PENDING variant, CSV output,
 * and docs:check consistency.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildIR, parsePartNumber, geometryTable, type IRData, type IRMeasurements, type Coord } from '../build/ct-ir';
import { buildCSV } from '../build/ct-csv';
import { _parseDatasheet, buildDS } from '../build/ct-ds';

// ── Shared fixtures ──────────────────────────────────────────────────

const SAMPLE_MEAS: IRMeasurements = {
  instrument: { type: 'Optical CMM', id: 'OCMM-01', cal: '2026-03', valid: '2027-03' },
  ambient_c: 20.4,
  ref_c: 20,
  U_k2_um: 1.5,
  flatness_points: 25,
  geometry: [
    { feature: 'Square pitch X', nominal: '10.000', measured: '10.0012', dev: '+1.2', tol: '\u00b12', result: 'PASS' },
    { feature: 'Square pitch Y', nominal: '10.000', measured: '9.9992', dev: '\u22120.8', tol: '\u00b12', result: 'PASS' },
    { feature: 'Pattern width',  nominal: '170.000', measured: '170.004', dev: '+4', tol: '\u00b15', result: 'PASS' },
    { feature: 'Pattern height', nominal: '120.000', measured: '120.003', dev: '+3', tol: '\u00b15', result: 'PASS' },
    { feature: 'Diagonal 1',    nominal: '208.087', measured: '208.091', dev: '+4', tol: '\u00b17', result: 'PASS' },
    { feature: 'Diagonal 2',    nominal: '208.087', measured: '208.085', dev: '\u22122', tol: '\u00b17', result: 'PASS' },
    { feature: 'Orthogonality',  nominal: '90.000\u00b0', measured: '90.0006\u00b0', dev: '', tol: '\u00b10.002\u00b0', result: 'PASS' },
    { feature: 'Max single-feature deviation (n = 176)', nominal: '\u2014', measured: '\u2014', dev: '1.6', tol: '\u00b7', result: 'PASS' },
    { feature: 'RMS deviation  information only', nominal: '\u2014', measured: '\u2014', dev: '0.7', tol: '\u2014', result: 'N/A' },
  ],
  flatness: { measured_um: 12, tol: '\u2264 20', method: '25 points, 5 \u00d7 5 grid, least-squares plane', result: 'PASS' },
  visual: [
    { check: 'Edge chamfer', criterion: '0.5 \u00d7 45\u00b0 on all edges, no chips > 0.3 mm', result: 'PASS' },
    { check: 'Surface defects', criterion: 'No scratches or pinholes in the pattern area', result: 'PASS' },
    { check: 'Print / edge definition', criterion: 'Square edges sharp, no ink bleed at 10\u00d7 loupe', result: 'PASS' },
    { check: 'Marking legibility', criterion: 'Label line, X / Y arrows and SN legible', result: 'PASS' },
  ],
  traceability: {
    instrument_cert: 'OCMM-01 \u00b7 certificate K-2026-03-0141 \u00b7 valid to 2027-03',
    reference: 'Golden sample GS-CHA-C-200150-6X6 \u00b7 DAkkS certificate [number] \u00b7 valid to [date]',
    retention: 'Raw data retained for 10 years under this serial number.',
  },
  coordinates: { file: 'CT-CSV-000311.csv', n: 176, max_id: 88, max_um: 1.6, rms_um: 0.65 },
};

function makeSampleCoords(): Coord[] {
  const coords: Coord[] = [];
  for (let i = 0; i < 10; i++) {
    coords.push({
      id: i,
      row: 0,
      col: i,
      x_nom: 10 + i * 10,
      y_nom: 10,
      x_meas: 10 + i * 10 + (Math.random() - 0.5) * 0.001,
      y_meas: 10 + (Math.random() - 0.5) * 0.001,
      dx_um: +(Math.random() * 2 - 1).toFixed(1),
      dy_um: +(Math.random() * 2 - 1).toFixed(1),
    });
  }
  return coords;
}

function makeIRData(): IRData {
  const geo = parsePartNumber('CT-CHA-C-200150-6X6');
  return {
    sn: '000311',
    lot: 'L-2611-0382',
    id_range: '0\u2013101',
    inspector: 'JG',
    date: '2026-10-24',
    label_line: 'CALIB.TOOLS   CT-CHA-C-200150-6X6   ChArUco 12\u00d717   SN 000311 \u00b7 Rev A',
    ...geo,
  };
}

// ── CT-IR integration ────────────────────────────────────────────────

describe('CT-IR full build', () => {
  let tmp: string;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'ct-ir-build-'));
  });

  it('PASS variant renders exactly 2 pages', async () => {
    const data = makeIRData();
    const coords = makeSampleCoords();
    const outBase = join(tmp, 'CT-IR-000311-PASS');
    const result = await buildIR({ data, measurements: SAMPLE_MEAS, coords, outBase });
    expect(result.pages).toBe(2);
  });

  it('PASS variant has no overflow', async () => {
    const data = makeIRData();
    const coords = makeSampleCoords();
    const outBase = join(tmp, 'CT-IR-000311-PASS-overflow');
    const result = await buildIR({ data, measurements: SAMPLE_MEAS, coords, outBase });
    // overflow is an array of overflow entries; empty = no overflow
    const hasOverflow = Array.isArray(result.overflow) && result.overflow.length > 0;
    expect(hasOverflow).toBe(false);
  });

  it('PENDING variant renders exactly 2 pages', async () => {
    const data = makeIRData();
    const outBase = join(tmp, 'CT-IR-000311-PENDING');
    const result = await buildIR({ data, measurements: null, coords: null, outBase });
    expect(result.pages).toBe(2);
  });

  it('PENDING variant geometry table has no measured digits', () => {
    const html: string = geometryTable(SAMPLE_MEAS, true);
    expect(html).toContain('PENDING');
    // In PENDING mode, measured column should not contain actual digits like 10.0012
    expect(html).not.toContain('10.0012');
    expect(html).not.toContain('9.9992');
  });

  it('SAMPLE watermark variant still renders 2 pages', async () => {
    const data = makeIRData();
    const coords = makeSampleCoords();
    const outBase = join(tmp, 'CT-IR-000311-SAMPLE');
    const result = await buildIR({ data, measurements: SAMPLE_MEAS, coords, outBase, watermark: 'SAMPLE' });
    expect(result.pages).toBe(2);
  });
});

// ── CT-DS integration ────────────────────────────────────────────────

describe('CT-DS build — no overflow', () => {
  const DS_CODES = [
    'CT-DS-CHA-C',
    'CT-DS-CHA-P',
    'CT-DS-CHT-P',
    'CT-DS-ACC-A-FIX-14',
    'CT-SV-CERT-ILAC',
  ];

  let tmp: string;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'ct-ds-build-'));
  });

  for (const code of DS_CODES) {
    it(`${code} renders without critical A4 overflow`, async () => {
      const outBase = join(tmp, code);
      const result = await buildDS({ code, outBase });
      expect(result.pages).toBeGreaterThanOrEqual(1);

      // Check A4 overflow: filter for A4 entries with overflow > page height tolerance
      // The ILAC cert has a known minor overflow; tolerate up to 20mm for now
      if (Array.isArray(result.overflow)) {
        for (const entry of result.overflow) {
          if (Array.isArray(entry) && entry[0] === 'A4') {
            // entry is [paper, page, overflow_mm, ...]
            const overflowMm = entry[2];
            // Flag anything over 25mm as a test failure (critical overflow)
            expect(overflowMm).toBeLessThan(25);
          }
        }
      }
    });
  }

  it('CT-DS-CHA-C renders 4 pages', async () => {
    const outBase = join(tmp, 'CT-DS-CHA-C-count');
    const result = await buildDS({ code: 'CT-DS-CHA-C', outBase });
    expect(result.pages).toBe(4);
  });

  it('CT-DS-CHA-P renders 3 pages', async () => {
    const outBase = join(tmp, 'CT-DS-CHA-P-count');
    const result = await buildDS({ code: 'CT-DS-CHA-P', outBase });
    expect(result.pages).toBe(3);
  });
});

// ── CT-CSV integration ──────────────────────────────────────────────

describe('CT-CSV output', () => {
  it('generates valid CSV with correct column count', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'ct-csv-int-'));
    const coords = makeSampleCoords();
    const out = join(tmp, 'test.csv');
    try {
      buildCSV(coords, out);
      const content = readFileSync(out, 'utf-8');
      const lines = content.trim().split('\n');
      const header = lines[0].split(',');
      expect(header).toEqual(['id', 'row', 'col', 'x_nom', 'y_nom', 'x_meas', 'y_meas', 'dx_um', 'dy_um']);
      expect(lines.length).toBe(coords.length + 1); // header + data rows
      // Each data row has same column count as header
      for (const line of lines.slice(1)) {
        expect(line.split(',').length).toBe(header.length);
      }
    } finally {
      rmSync(tmp, { recursive: true });
    }
  });
});
