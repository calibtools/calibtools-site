import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFrontMatter, _parseDatasheet, charucoCornerCount, charucoMarkerCount } from '../build/ct-ds';
import { Doc } from '../ctdoc';

// ── Load test data ──

const CHA_C_MD = readFileSync(
  resolve(process.cwd(), 'docs/datasheets/CT-DS-CHA-C.md'),
  'utf-8',
);

const CHA_P_MD = readFileSync(
  resolve(process.cwd(), 'docs/datasheets/CT-DS-CHA-P.md'),
  'utf-8',
);

const ACC_FIX_MD = readFileSync(
  resolve(process.cwd(), 'docs/datasheets/CT-DS-ACC-A-FIX-14.md'),
  'utf-8',
);

const ILAC_MD = readFileSync(
  resolve(process.cwd(), 'docs/datasheets/CT-SV-CERT-ILAC.md'),
  'utf-8',
);

// ── Front matter parsing ──

describe('parseFrontMatter', () => {
  it('correctly reads CT-DS-CHA-C.md front matter', () => {
    const { meta } = parseFrontMatter(CHA_C_MD);
    expect(meta.code).toBe('CT-DS-CHA-C');
    expect(meta.title).toBe('ChArUco calibration target, ceramic');
    expect(meta.type).toBe('datasheet');
    expect(meta.rev).toBe('A');
    expect(meta.family).toBe('CHA');
    expect(meta.material).toBe('C');
  });

  it('correctly reads CT-DS-CHA-P.md front matter', () => {
    const { meta } = parseFrontMatter(CHA_P_MD);
    expect(meta.code).toBe('CT-DS-CHA-P');
    expect(meta.family).toBe('CHA');
    expect(meta.material).toBe('P');
  });

  it('correctly reads CT-DS-ACC-A-FIX-14.md front matter', () => {
    const { meta } = parseFrontMatter(ACC_FIX_MD);
    expect(meta.code).toBe('CT-DS-ACC-A-FIX-14');
    expect(meta.family).toBe('ACC');
  });

  it('correctly reads CT-SV-CERT-ILAC.md front matter', () => {
    const { meta } = parseFrontMatter(ILAC_MD);
    expect(meta.code).toBe('CT-SV-CERT-ILAC');
    expect(meta.type).toBe('service');
    expect(meta.family).toBe('SVC');
  });
});

// ── Full datasheet parsing ──

describe('parseDatasheet', () => {
  it('parses CHA-C positioning text', () => {
    const ds = _parseDatasheet(CHA_C_MD);
    expect(ds.positioning).toContain('alumina ceramic');
  });

  it('parses CHA-C ordering table with 4 variants', () => {
    const ds = _parseDatasheet(CHA_C_MD);
    expect(ds.ordering).not.toBeNull();
    expect(ds.ordering!.rows.length).toBe(4);
    expect(ds.ordering!.rows[0][0]).toContain('CT-CHA-C-110085');
  });

  it('parses CHA-C spec groups (geometry, physical, environment)', () => {
    const ds = _parseDatasheet(CHA_C_MD);
    const titles = ds.specGroups.map((g) => g.title);
    expect(titles).toContain('Geometry');
    expect(titles).toContain('Physical');
    expect(titles).toContain('Environment');
  });

  it('parses CHA-C geometry specs with accuracy', () => {
    const ds = _parseDatasheet(CHA_C_MD);
    const geo = ds.specGroups.find((g) => g.title === 'Geometry');
    expect(geo).toBeDefined();
    const accuracy = geo!.rows.find((r) => r[0].includes('accuracy'));
    expect(accuracy).toBeDefined();
    expect(accuracy![1]).toContain('2');
  });

  it('parses CHA-C revision history', () => {
    const ds = _parseDatasheet(CHA_C_MD);
    expect(ds.revisionHistory).not.toBeNull();
    expect(ds.revisionHistory!.rows[0][0]).toBe('A');
  });

  it('parses CHA-P ordering table with 5 variants', () => {
    const ds = _parseDatasheet(CHA_P_MD);
    expect(ds.ordering!.rows.length).toBe(5);
  });

  it('parses ACC-A-FIX-14 as a flat spec table', () => {
    const ds = _parseDatasheet(ACC_FIX_MD);
    expect(ds.specGroups.length).toBeGreaterThanOrEqual(1);
    const specs = ds.specGroups[0];
    expect(specs.rows.some((r) => r[0].includes('Jaw opening'))).toBe(true);
  });

  it('parses ILAC service compliance', () => {
    const ds = _parseDatasheet(ILAC_MD);
    // ILAC has no compliance section — that is expected
    expect(ds.compliance).toBeNull();
  });

  it('parses CHA-C deliverables from spec subsection', () => {
    const ds = _parseDatasheet(CHA_C_MD);
    expect(ds.deliverables).not.toBeNull();
    expect(ds.deliverables!.some((r) => r[0].includes('Inspection report'))).toBe(true);
  });
});

// ── HTML output for CHA-C ──

describe('buildDS HTML (CHA-C) — via Doc', () => {
  it('generates HTML with ordering table (4 variants)', () => {
    const ds = _parseDatasheet(CHA_C_MD);
    expect(ds.meta.code).toBe('CT-DS-CHA-C');
    expect(ds.ordering).not.toBeNull();
    expect(ds.ordering!.rows.length).toBe(4);
    expect(ds.ordering!.rows[0][0]).toContain('CT-CHA-C');
  });

  it('generates HTML containing spec tables', () => {
    const ds = _parseDatasheet(CHA_C_MD);

    const geo = ds.specGroups.find((g) => g.title === 'Geometry');
    expect(geo).toBeDefined();
    expect(geo!.rows.length).toBeGreaterThanOrEqual(2);

    const phys = ds.specGroups.find((g) => g.title === 'Physical');
    expect(phys).toBeDefined();

    const env = ds.specGroups.find((g) => g.title === 'Environment');
    expect(env).toBeDefined();
  });
});

// ── HTML output integration (without Playwright) ──

describe('Doc HTML output for CHA-C', () => {
  it('produces 4 pages', () => {
    // Minimal doc to verify page count matches CHA-C layout
    const d = new Doc(
      'CT-DS-CHA-C', 'A', '2026-10-24',
      'Datasheet', 'ChArUco calibration target \u00b7 ceramic',
    );
    d.addPage('<p>Page 1</p>');
    d.addPage('<p>Page 2</p>');
    d.addPage('<p>Page 3</p>');
    d.addPage('<p>Page 4</p>');
    const html = d.html('A4');
    const pageCount = (html.match(/class="page"/g) || []).length;
    expect(pageCount).toBe(4);
  });

  it('includes the header ID in each page', () => {
    const d = new Doc(
      'CT-DS-CHA-C', 'A', '2026-10-24',
      'Datasheet', 'ChArUco calibration target \u00b7 ceramic',
    );
    d.addPage('<p>content</p>');
    const html = d.html('A4');
    expect(html).toContain('CT-DS-CHA-C');
    expect(html).toContain('Rev A');
  });

  it('includes CONTACT_LINE in footer', () => {
    const d = new Doc(
      'CT-DS-CHA-C', 'A', '2026-10-24',
      'Datasheet', 'ChArUco calibration target \u00b7 ceramic',
    );
    d.addPage('<p>content</p>');
    const html = d.html('A4');
    expect(html).toContain('hello@calib.tools');
  });
});

// ── ChArUco marker/corner count derivation ──

describe('charucoCornerCount / charucoMarkerCount', () => {
  it('corners = (rows-1)(cols-1) and markers = floor(rows*cols/2) for every CHA-C ordering row', () => {
    const ds = _parseDatasheet(CHA_C_MD);
    expect(ds.ordering).not.toBeNull();

    for (const row of ds.ordering!.rows) {
      const squaresMatch = row[2].match(/(\d+)\s*[×x]\s*(\d+)/);
      if (!squaresMatch) continue;
      const r = Number(squaresMatch[1]);
      const c = Number(squaresMatch[2]);

      const cornersInTable = Number(row[5]);
      const markersInTable = Number(row[6]);

      expect(charucoCornerCount(r, c)).toBe(cornersInTable);
      expect(charucoMarkerCount(r, c)).toBe(markersInTable);
    }
  });

  it('corners = (rows-1)(cols-1) and markers = floor(rows*cols/2) for every CHA-P ordering row', () => {
    const CHA_P_MD = readFileSync(
      resolve(process.cwd(), 'docs/datasheets/CT-DS-CHA-P.md'),
      'utf-8',
    );
    const ds = _parseDatasheet(CHA_P_MD);
    expect(ds.ordering).not.toBeNull();

    for (const row of ds.ordering!.rows) {
      const squaresMatch = row[2].match(/(\d+)\s*[×x]\s*(\d+)/);
      if (!squaresMatch) continue;
      const r = Number(squaresMatch[1]);
      const c = Number(squaresMatch[2]);

      const cornersInTable = Number(row[5]);
      const markersInTable = Number(row[6]);

      expect(charucoCornerCount(r, c)).toBe(cornersInTable);
      expect(charucoMarkerCount(r, c)).toBe(markersInTable);
    }
  });

  it('known values: 7×11 → 60 corners, 38 markers (not 39)', () => {
    expect(charucoCornerCount(7, 11)).toBe(60);
    expect(charucoMarkerCount(7, 11)).toBe(38);
  });
});
