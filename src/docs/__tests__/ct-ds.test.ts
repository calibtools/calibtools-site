import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFrontMatter, _parseDatasheet, charucoCornerCount, charucoMarkerCount } from '../build/ct-ds';
import { Doc } from '../ctdoc';
import { COMPOSITE_SIZES, CERAMIC_SIZES } from '../../lib/boardSizes';
import { markerForSquare } from '../../lib/boardSizes';
import { kalibrYaml, ros2Yaml, halconDescr, opencvJson } from '../../lib/exportConfig';
import type { PatternSpec } from '../../lib/patterns';

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
    expect(meta.title).toBe('ChArUco Calibration Target, Alumina Ceramic');
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

// ── Marker-size consistency: boardSizes.ts is the single source of truth ──

describe('marker-size consistency with boardSizes.ts', () => {
  it('CT-DS-CHA-P.md ordering table marker sizes match COMPOSITE_SIZES', () => {
    const ds = _parseDatasheet(CHA_P_MD);
    expect(ds.ordering).not.toBeNull();
    for (const row of ds.ordering!.rows) {
      // "Square / marker" column, e.g. "25 / 18 mm"
      const geomCol = row[3];
      const match = geomCol.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      expect(match, `cannot parse square/marker from "${geomCol}"`).not.toBeNull();
      const sq = Number(match![1]);
      const mk = Number(match![2]);
      const expected = COMPOSITE_SIZES.find((s) => s.square === sq);
      expect(expected, `no COMPOSITE_SIZES entry for square=${sq}`).toBeDefined();
      expect(mk).toBe(expected!.marker);
    }
  });

  it('CT-DS-CHA-C.md ordering table marker sizes match CERAMIC_SIZES', () => {
    const ds = _parseDatasheet(CHA_C_MD);
    expect(ds.ordering).not.toBeNull();
    for (const row of ds.ordering!.rows) {
      const geomCol = row[3];
      const match = geomCol.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      expect(match, `cannot parse square/marker from "${geomCol}"`).not.toBeNull();
      const sq = Number(match![1]);
      const mk = Number(match![2]);
      const expected = CERAMIC_SIZES.find((s) => s.square === sq);
      expect(expected, `no CERAMIC_SIZES entry for square=${sq}`).toBeDefined();
      expect(mk).toBe(expected!.marker);
    }
  });

  it('exported config files use markerForSquare for every board size', () => {
    for (const bs of [...COMPOSITE_SIZES, ...CERAMIC_SIZES]) {
      const spec: PatternSpec = {
        type: 'ChArUco', rows: 7, cols: 10,
        square: bs.square, marker: bs.marker,
        dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
      };
      // .opencv.json
      const json = JSON.parse(opencvJson(spec));
      expect(json.marker_mm).toBe(bs.marker);
      // .kalibr.yaml — ChArUco is written as checkerboard, no marker_size line
      // .ros2.yaml
      const ros2 = ros2Yaml(spec);
      expect(ros2).toContain(`marker_size: ${(bs.marker / 1000).toFixed(6)}`);
      // markerForSquare roundtrip
      expect(markerForSquare(bs.square)).toBe(bs.marker);
    }
  });

  it('CT-DS-CHA-P.md does not quote a ratio range that excludes any composite size', () => {
    const ratioMatch = CHA_P_MD.match(/(\d+\.\d+)[–-](\d+\.\d+)/);
    if (ratioMatch) {
      const lo = Number(ratioMatch[1]);
      const hi = Number(ratioMatch[2]);
      for (const bs of COMPOSITE_SIZES) {
        const ratio = Math.round(bs.ratio * 100) / 100;
        expect(ratio).toBeGreaterThanOrEqual(lo);
        expect(ratio).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('CT-DS-CHA-C.md does not quote a composite-only marker ratio range', () => {
    // Ceramic 150×100 has ratio 0.76, outside the composite range 0.72–0.75.
    // CHA-C.md must not include a "0.72–0.75" range statement.
    expect(CHA_C_MD).not.toMatch(/0\.72[–-]0\.75/);
  });
});
