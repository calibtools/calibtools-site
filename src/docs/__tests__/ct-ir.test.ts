import { describe, it, expect } from 'vitest';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  identBlock,
  inspectionBlock,
  geometryTable,
  flatnessTable,
  visualTable,
  coordsPreview,
  parsePartNumber,
  type IRData,
  type IRMeasurements,
  type Coord,
} from '../build/ct-ir';
import { buildCSV } from '../build/ct-csv';

// ── fixtures ──

const SAMPLE_DATA: IRData = {
  sn: '000311',
  part_number: 'CT-CHA-C-185110-6X6',
  lot: 'L-2611-0382',
  id_range: '0\u201341',
  inspector: 'JG',
  date: '2026-10-24',
  description: 'ChArUco calibration target, ceramic, 185 \u00d7 110 mm',
  datasheet: 'CT-DS-CHA-C',
  datasheet_rev: 'A',
  W: 185,
  H: 110,
  rows: 7,
  cols: 12,
  sq: 14,
  marker: 10.5,
  mx: 8.5,
  my: 6,
  dict_name: 'DICT_6X6_250',
  start_id: 0,
  corners: 66,
  markers: 42,
  label_line:
    'CALIB.TOOLS   CT-CHA-C-185110-6X6   ChArUco 7\u00d712 \u00b7 14/10.5 mm \u00b7 DICT_6X6_250 \u00b7 IDs 0\u201341   SN 000311 \u00b7 Rev A',
  axes_spec: [4.5, 4.5, 6.5, 0.6],
};

const SAMPLE_MEAS: IRMeasurements = {
  instrument: { type: 'Optical CMM', id: 'OCMM-01', cal: '2026-03', valid: '2027-03' },
  ambient_c: 20.4,
  ref_c: 20,
  U_k2_um: 1.5,
  flatness_points: 25,
  geometry: [
    { feature: 'Square pitch X', nominal: '14.000', measured: '14.0008', dev: '+0.8', tol: '\u00b12', result: 'PASS' },
    { feature: 'Square pitch Y', nominal: '14.000', measured: '13.9994', dev: '\u22120.6', tol: '\u00b12', result: 'PASS' },
  ],
  flatness: { measured_um: 12, tol: '\u2264 20', method: '25 points, 5 \u00d7 5 grid, least-squares plane', result: 'PASS' },
  visual: [
    { check: 'Edge chamfer', criterion: '0.5 \u00d7 45\u00b0 on all edges, no chips > 0.3 mm', result: 'PASS' },
    { check: 'Surface defects', criterion: 'No scratches or pinholes in the pattern area', result: 'PASS' },
  ],
  traceability: {
    instrument_cert: 'OCMM-01 \u00b7 certificate K-2026-03-0141 \u00b7 valid to 2027-03',
    reference: 'Golden sample GS-CHA-C-185110-6X6 \u00b7 DAkkS certificate [number] \u00b7 valid to [date]',
    retention: 'Raw data retained for 10 years under this serial number.',
  },
  coordinates: { file: 'CT-CSV-000311.csv', n: 66, max_id: 33, max_um: 1.4, rms_um: 0.6 },
};

const SAMPLE_COORDS: Coord[] = [
  { id: 0, row: 0, col: 0, x_nom: 14, y_nom: 14, x_meas: 14.0002, y_meas: 14, dx_um: 0.2, dy_um: 0 },
  { id: 1, row: 0, col: 1, x_nom: 28, y_nom: 14, x_meas: 28.0008, y_meas: 14.0004, dx_um: 0.8, dy_um: 0.4 },
  { id: 2, row: 0, col: 2, x_nom: 42, y_nom: 14, x_meas: 42.0005, y_meas: 14.0004, dx_um: 0.5, dy_um: 0.4 },
];

// ── parsePartNumber ──

describe('parsePartNumber', () => {
  it('parses CT-CHA-C-185110-6X6', () => {
    const r = parsePartNumber('CT-CHA-C-185110-6X6');
    expect(r.W).toBe(185);
    expect(r.H).toBe(110);
    expect(r.rows).toBe(7);
    expect(r.cols).toBe(12);
    expect(r.sq).toBe(14);
    expect(r.marker).toBe(10.5);
    expect(r.corners).toBe(66);
    expect(r.markers).toBe(42);
    expect(r.dict_name).toBe('DICT_6X6_250');
  });

  it('throws on unknown part number', () => {
    expect(() => parsePartNumber('CT-CHA-C-300200-6X6')).toThrow();
  });
});

// ── identBlock ──

describe('identBlock', () => {
  it('contains part number and serial number', () => {
    const html = identBlock(SAMPLE_DATA);
    expect(html).toContain('CT-CHA-C-185110-6X6');
    expect(html).toContain('000311');
    expect(html).toContain('L-2611-0382');
    expect(html).toContain('DICT_6X6_250');
  });

  it('shows marker ID range', () => {
    const html = identBlock(SAMPLE_DATA);
    expect(html).toContain('0\u201341');
    expect(html).toContain('42 markers');
  });
});

// ── inspectionBlock ──

describe('inspectionBlock', () => {
  it('shows instrument info when not pending', () => {
    const html = inspectionBlock(SAMPLE_DATA, SAMPLE_MEAS, false);
    expect(html).toContain('OCMM-01');
    expect(html).toContain('2026-03');
    expect(html).toContain('20.4');
  });

  it('shows dashes when pending', () => {
    const html = inspectionBlock(SAMPLE_DATA, null, true);
    expect(html).toContain('\u2014');
    // Should not contain ambient temp
    expect(html).not.toContain('20.4');
  });
});

// ── geometryTable ──

describe('geometryTable', () => {
  it('renders pass results', () => {
    const html = geometryTable(SAMPLE_MEAS, false);
    expect(html).toContain('Square pitch X');
    expect(html).toContain('14.0008');
    expect(html).toContain('PASS');
  });

  it('renders PENDING when pending', () => {
    const html = geometryTable(SAMPLE_MEAS, true);
    expect(html).toContain('PENDING');
    expect(html).not.toContain('14.0008');
  });
});

// ── flatnessTable ──

describe('flatnessTable', () => {
  it('shows measured value', () => {
    const html = flatnessTable(SAMPLE_MEAS, false);
    expect(html).toContain('12');
    expect(html).toContain('PASS');
  });

  it('shows PENDING', () => {
    const html = flatnessTable(SAMPLE_MEAS, true);
    expect(html).toContain('PENDING');
  });
});

// ── visualTable ──

describe('visualTable', () => {
  it('lists checks', () => {
    const html = visualTable(SAMPLE_MEAS, false);
    expect(html).toContain('Edge chamfer');
    expect(html).toContain('Surface defects');
    expect(html).toContain('PASS');
  });
});

// ── coordsPreview ──

describe('coordsPreview', () => {
  it('shows first rows when data present', () => {
    const html = coordsPreview(SAMPLE_DATA, SAMPLE_MEAS, SAMPLE_COORDS, false);
    expect(html).toContain('CT-CSV-000311.csv');
    expect(html).toContain('14.000');
    expect(html).toContain('14.0002');
  });

  it('shows pending message when pending', () => {
    const html = coordsPreview(SAMPLE_DATA, null, null, true);
    expect(html).toContain('Measurement pending');
    expect(html).toContain('CT-CSV-000311.csv');
  });
});

// ── buildCSV ──

describe('buildCSV', () => {
  it('generates correct CSV with header and rows', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'ct-csv-'));
    const out = join(tmp, 'test.csv');
    try {
      buildCSV(SAMPLE_COORDS, out);
      const content = readFileSync(out, 'utf-8');
      const lines = content.split('\n');
      expect(lines[0]).toBe('id,row,col,x_nom,y_nom,x_meas,y_meas,dx_um,dy_um');
      expect(lines[1]).toBe('0,0,0,14.000,14.000,14.0002,14.0000,0.2,0.0');
      expect(lines[2]).toBe('1,0,1,28.000,14.000,28.0008,14.0004,0.8,0.4');
      expect(lines[3]).toBe('2,0,2,42.000,14.000,42.0005,14.0004,0.5,0.4');
      // trailing newline means last element is empty string
      expect(lines[4]).toBe('');
      expect(lines.length).toBe(5); // header + 3 rows + trailing newline
    } finally {
      rmSync(tmp, { recursive: true });
    }
  });
});
