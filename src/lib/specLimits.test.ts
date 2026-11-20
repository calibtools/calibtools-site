import { describe, it, expect } from 'vitest';
import { safeSpec, limitNote, GRID_MAX } from './specLimits';
import type { PatternSpec } from './patterns';

const base: PatternSpec = { type: 'ChArUco', rows: 7, cols: 10, square: 20, marker: 15, dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true };

describe('generator input limits', () => {
  it('leaves a valid spec untouched, as the same object', () => {
    expect(safeSpec(base, base)).toBe(base);
    expect(limitNote(base, safeSpec(base, base))).toBeNull();
  });
  it('keeps small real sizes, such as 0.5 mm dots on glass', () => {
    const s = { ...base, square: 0.5, marker: 0.35 };
    expect(safeSpec(s, base)).toBe(s);
  });
  it.each([[-1, 2], [0, 2], [1, 2], [99999, GRID_MAX], [NaN, 7], [7.6, 8]])('rows %s becomes %s', (typed, used) => {
    const safe = safeSpec({ ...base, rows: typed }, base);
    expect(safe.rows).toBe(used);
    expect((safe.rows - 1) * (safe.cols - 1)).toBeGreaterThan(0);
  });
  it('allows a single marker on a marker sheet', () => {
    const s: PatternSpec = { ...base, type: 'Marker sheet', rows: 1, cols: 1 };
    expect(safeSpec(s, base)).toBe(s);
  });
  it('replaces empty, zero and negative sizes and IDs', () => {
    const safe = safeSpec({ ...base, square: 0, marker: -3, startId: -5, circleDiameter: -1, tagSpacing: 9 }, base);
    expect(safe).toMatchObject({ square: 20, marker: 15, startId: 0, circleDiameter: 20, tagSpacing: 1 });
  });
  it('tells the visitor what the preview uses', () => {
    const raw = { ...base, rows: 0 };
    expect(limitNote(raw, safeSpec(raw, base))).toBe(`Rows and columns go from 2 to ${GRID_MAX}. The preview uses 2 × 10.`);
    const raw2 = { ...base, square: -1 };
    expect(limitNote(raw2, safeSpec(raw2, base))).toMatch(/greater than zero/);
  });
});
