import { describe, it, expect } from 'vitest';
import {
  BRAND_RED,
  BRAND_INK,
  BRAND_URL,
  BRAND_NAME,
  BRAND_EMAIL,
  BRAND_RED_RGB,
  BRAND_INK_RGB,
  LOGO_CELLS,
  logoSvgPaths,
  patternSummary,
  brandLine,
} from './brand';

describe('brand constants', () => {
  it('BRAND_RED is correct hex', () => {
    expect(BRAND_RED).toBe('#E60012');
  });

  it('BRAND_INK is correct hex', () => {
    expect(BRAND_INK).toBe('#1A1A1A');
  });

  it('BRAND_URL is correct', () => {
    expect(BRAND_URL).toBe('calib.tools');
  });

  it('BRAND_NAME is correct', () => {
    expect(BRAND_NAME).toBe('Calib.Tools');
  });

  it('BRAND_EMAIL is correct', () => {
    expect(BRAND_EMAIL).toBe('hello@calib.tools');
  });

  it('BRAND_RED_RGB matches #E60012', () => {
    expect(BRAND_RED_RGB.r).toBeCloseTo(230 / 255, 9);
    expect(BRAND_RED_RGB.g).toBeCloseTo(0, 9);
    expect(BRAND_RED_RGB.b).toBeCloseTo(18 / 255, 9);
  });

  it('BRAND_INK_RGB matches #1A1A1A', () => {
    expect(BRAND_INK_RGB.r).toBeCloseTo(26 / 255, 9);
    expect(BRAND_INK_RGB.g).toBeCloseTo(26 / 255, 9);
    expect(BRAND_INK_RGB.b).toBeCloseTo(26 / 255, 9);
  });
});

describe('LOGO_CELLS', () => {
  it('has exactly 9 entries', () => {
    expect(LOGO_CELLS).toHaveLength(9);
  });

  it('even indices (0,2,4,6,8) use BRAND_RED', () => {
    for (const idx of [0, 2, 4, 6, 8]) {
      expect(LOGO_CELLS[idx].fill).toBe(BRAND_RED);
    }
  });

  it('odd indices (1,3,5,7) use BRAND_INK', () => {
    for (const idx of [1, 3, 5, 7]) {
      expect(LOGO_CELLS[idx].fill).toBe(BRAND_INK);
    }
  });

  it('cells have col and row from 0 to 2 in row-major order', () => {
    expect(LOGO_CELLS[0]).toMatchObject({ col: 0, row: 0 });
    expect(LOGO_CELLS[1]).toMatchObject({ col: 1, row: 0 });
    expect(LOGO_CELLS[2]).toMatchObject({ col: 2, row: 0 });
    expect(LOGO_CELLS[3]).toMatchObject({ col: 0, row: 1 });
    expect(LOGO_CELLS[8]).toMatchObject({ col: 2, row: 2 });
  });
});

describe('logoSvgPaths', () => {
  const opts = { x: 0, y: 0, cellSize: 10, gap: 2 };

  it('returns exactly 9 <rect> strings', () => {
    const paths = logoSvgPaths(opts);
    expect(paths).toHaveLength(9);
    for (const p of paths) {
      expect(p).toMatch(/^<rect /);
    }
  });

  it('first cell (even, BRAND_RED) is at x=0, y=0', () => {
    const paths = logoSvgPaths(opts);
    expect(paths[0]).toContain('x="0"');
    expect(paths[0]).toContain('y="0"');
    expect(paths[0]).toContain(`fill="${BRAND_RED}"`);
  });

  it('second cell (odd, BRAND_INK) is offset by cellSize+gap', () => {
    const paths = logoSvgPaths(opts);
    expect(paths[1]).toContain('x="12"');
    expect(paths[1]).toContain('y="0"');
    expect(paths[1]).toContain(`fill="${BRAND_INK}"`);
  });

  it('fourth cell (index 3, BRAND_INK) starts second row', () => {
    // row 1, col 0 → x=0, y=cellSize+gap=12
    const paths = logoSvgPaths(opts);
    expect(paths[3]).toContain('x="0"');
    expect(paths[3]).toContain('y="12"');
  });

  it('uses width and height equal to cellSize', () => {
    const paths = logoSvgPaths(opts);
    for (const p of paths) {
      expect(p).toContain('width="10"');
      expect(p).toContain('height="10"');
    }
  });

  it('respects non-zero x and y origin', () => {
    const paths = logoSvgPaths({ x: 5, y: 20, cellSize: 8, gap: 1 });
    // first cell: x=5, y=20
    expect(paths[0]).toContain('x="5"');
    expect(paths[0]).toContain('y="20"');
    // second cell: x=5+8+1=14, y=20
    expect(paths[1]).toContain('x="14"');
    expect(paths[1]).toContain('y="20"');
  });
});

describe('patternSummary', () => {
  it('formats ChArUco with dict and id', () => {
    const s = patternSummary({
      type: 'ChArUco',
      rows: 7,
      cols: 10,
      square: 25,
      marker: 18,
      dict: 'DICT_6X6_250',
      startId: 0,
    });
    expect(s).toBe('ChArUco 7\u00D710 \u00B7 25/18 mm \u00B7 DICT_6X6_250 \u00B7 IDs 0\u201334');
  });

  it('uses × (U+00D7) not x', () => {
    const s = patternSummary({ type: 'Checkerboard', rows: 7, cols: 10, square: 25 });
    expect(s).toContain('×');
    expect(s).not.toMatch(/\d+x\d+/);
  });

  it('formats Checkerboard without dict/marker', () => {
    const s = patternSummary({ type: 'Checkerboard', rows: 7, cols: 10, square: 25 });
    expect(s).toBe('Checkerboard 7×10 · 25 mm');
  });

  it('formats ChArUco with startId other than 0', () => {
    const s = patternSummary({
      type: 'ChArUco',
      rows: 5,
      cols: 8,
      square: 30,
      marker: 20,
      dict: 'DICT_4X4_50',
      startId: 10,
    });
    expect(s).toBe('ChArUco 5\u00D78 \u00B7 30/20 mm \u00B7 DICT_4X4_50 \u00B7 IDs 10\u201329');
  });
});

describe('brandLine', () => {
  it('includes the summary text', () => {
    const line = brandLine({ summary: 'ChArUco 7\u00D710 \u00B7 25/18 mm \u00B7 DICT_6X6_250 \u00B7 IDs 0\u201334' });
    expect(line).toContain('ChArUco 7\u00D710 \u00B7 25/18 mm \u00B7 DICT_6X6_250 \u00B7 IDs 0\u201334');
  });

  it('includes the domain URL', () => {
    const line = brandLine({ summary: 'test' });
    expect(line).toContain('calib.tools');
  });

  it('includes copyright text', () => {
    const line = brandLine({ summary: 'test' });
    expect(line).toContain('© Calib.Tools');
    expect(line).toContain('free to use');
    expect(line).toContain('calib.tools/targets');
  });

  it('includes ISO date when date provided', () => {
    const line = brandLine({ summary: 'test', date: '2024-03-15' });
    expect(line).toContain('generated 2024-03-15');
  });

  it('uses today ISO date when no date provided', () => {
    const line = brandLine({ summary: 'test' });
    const todayIso = new Date().toISOString().slice(0, 10);
    expect(line).toContain(`generated ${todayIso}`);
  });

  it('matches full expected format', () => {
    const line = brandLine({ summary: 'ChArUco 7\u00D710 \u00B7 25/18 mm \u00B7 DICT_6X6_250 \u00B7 IDs 0\u201334', date: '2025-01-01' });
    expect(line).toBe(
      'ChArUco 7\u00D710 \u00B7 25/18 mm \u00B7 DICT_6X6_250 \u00B7 IDs 0\u201334 \u00B7 generated 2025-01-01 \u00B7 calib.tools \u00B7 Patterns and files \u00A9 Calib.Tools, free to use; targets available at calib.tools/targets'
    );
  });
});

describe('patternSummary with ID ranges', () => {
  it('ChArUco shows "IDs 0\u201334" instead of "id 0"', () => {
    const s = patternSummary({
      type: 'ChArUco', rows: 7, cols: 10, square: 25,
      marker: 18, dict: 'DICT_6X6_250', startId: 0,
    });
    expect(s).toContain('IDs 0\u201334');
    expect(s).not.toContain('id 0');
  });

  it('ChArUco with startId=10 shows "IDs 10\u201344"', () => {
    const s = patternSummary({
      type: 'ChArUco', rows: 7, cols: 10, square: 25,
      marker: 18, dict: 'DICT_6X6_250', startId: 10,
    });
    expect(s).toContain('IDs 10\u201344');
  });

  it('Checkerboard has no ID in summary', () => {
    const s = patternSummary({
      type: 'Checkerboard', rows: 7, cols: 10, square: 25,
    });
    expect(s).not.toContain('ID');
  });
});
