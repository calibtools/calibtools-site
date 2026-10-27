import { describe, it, expect } from 'vitest';
import {
  BRAND_RED,
  BRAND_INK,
  BRAND_URL,
  BRAND_NAME,
  BRAND_EMAIL,
  BRAND_RED_RGB,
  BRAND_INK_RGB,
  patternSummary,
  brandLine,
} from './brand';
import {
  WORDMARK_SVG_POSITIVE,
  WORDMARK_PATHS,
  WORDMARK_VB,
  provenanceLine,
  PRINT_NOTE,
} from './exportBrand';

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

describe('wordmark SVG (bracket-framed)', () => {
  it('positive SVG contains CALIB.TOOLS title', () => {
    expect(WORDMARK_SVG_POSITIVE).toContain('CALIB.TOOLS wordmark-compact positive');
  });

  it('has 10 letter outline paths', () => {
    expect(WORDMARK_PATHS).toHaveLength(10);
  });

  it('viewBox has correct dimensions', () => {
    expect(WORDMARK_VB.width).toBeCloseTo(7174.4, 1);
    expect(WORDMARK_VB.height).toBeCloseTo(770.4, 1);
  });

  it('positive SVG contains red dot #E60012', () => {
    expect(WORDMARK_SVG_POSITIVE).toContain('#E60012');
  });
});

describe('exportBrand helpers', () => {
  it('provenanceLine includes site URL, date and version', () => {
    const line = provenanceLine('generator', '2026-10-28');
    expect(line).toContain('calib.tools/tools/generator');
    expect(line).toContain('2026-10-28');
    expect(line).toContain('v0.1.0');
  });

  it('PRINT_NOTE is the correct disclaimer', () => {
    expect(PRINT_NOTE).toContain('not measured');
    expect(PRINT_NOTE).toContain('ruler');
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
