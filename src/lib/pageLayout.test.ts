import { describe, it, expect } from 'vitest';
import {
  PAPERS,
  PAGE_MARGIN,
  computeLayout,
  computeTiling,
  computeGridReduction,
  smallestFittingPaper,
  patternFits,
  decideOrientation,
  orientPaper,
  wordmarkWidth,
  fitNotice,
  reductionNotice,
} from './pageLayout';
import type { PatternSpec } from './patterns';

// Convenience: a ChArUco spec builder
function spec(overrides: Partial<PatternSpec> = {}): PatternSpec {
  return {
    type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
    dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
    showAxes: true,
    ...overrides,
  };
}

describe('decideOrientation', () => {
  it('300×200 mm pattern → landscape', () => {
    expect(decideOrientation(300, 200)).toBe('landscape');
  });

  it('200×300 mm pattern → portrait', () => {
    expect(decideOrientation(200, 300)).toBe('portrait');
  });

  it('210×297 mm (square-ish but taller) → portrait', () => {
    expect(decideOrientation(210, 297)).toBe('portrait');
  });

  it('equal sides → portrait (not wider than tall)', () => {
    expect(decideOrientation(200, 200)).toBe('portrait');
  });

  it('manual override portrait', () => {
    expect(decideOrientation(300, 200, 'portrait')).toBe('portrait');
  });

  it('manual override landscape', () => {
    expect(decideOrientation(200, 300, 'landscape')).toBe('landscape');
  });
});

describe('orientPaper', () => {
  it('A4 portrait → 210 × 297', () => {
    expect(orientPaper(210, 297, 'portrait')).toEqual([210, 297]);
  });

  it('A4 landscape → 297 × 210', () => {
    expect(orientPaper(210, 297, 'landscape')).toEqual([297, 210]);
  });
});

describe('wordmarkWidth', () => {
  it('A4 portrait (210×297) → 42 mm', () => {
    expect(wordmarkWidth(210, 297)).toBe(42);
  });

  it('A4 landscape (297×210) → 42 mm (uses shorter dim)', () => {
    expect(wordmarkWidth(297, 210)).toBe(42);
  });

  it('A3 (297×420) → proportionally larger', () => {
    expect(wordmarkWidth(297, 420)).toBeGreaterThan(42);
  });

  it('never below 36 mm', () => {
    expect(wordmarkWidth(100, 150)).toBeGreaterThanOrEqual(36);
  });
});

describe('computeLayout — orientation', () => {
  it('7×12 ChArUco 25mm (bw=300, bh=175) on A4 → landscape', () => {
    const s = spec({ rows: 7, cols: 12, square: 25 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.orientation).toBe('landscape');
    expect(layout.pw).toBe(297); // A4 long side
    expect(layout.ph).toBe(210); // A4 short side
  });

  it('7×10 ChArUco 25mm (bw=250, bh=175) on A4 → landscape (250 > 175)', () => {
    const s = spec({ rows: 7, cols: 10, square: 25 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.orientation).toBe('landscape');
  });

  it('10×7 ChArUco 25mm (bw=175, bh=250) on A4 → portrait', () => {
    const s = spec({ rows: 10, cols: 7, square: 25 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.orientation).toBe('portrait');
  });

  it('manual override forces portrait for wide pattern', () => {
    const s = spec({ rows: 7, cols: 12, square: 25 });
    const layout = computeLayout(s, 210, 297, 'portrait');
    expect(layout.orientation).toBe('portrait');
    expect(layout.pw).toBe(210);
  });
});

describe('computeLayout — fit notice', () => {
  it('320×240 on A4 → fit is tile (doesn\'t fit)', () => {
    const s = spec({ rows: 8, cols: 12, square: 30, scaleBar: true }); // 360×240
    const layout = computeLayout(s, 210, 297);
    expect(layout.fit).not.toBe('single');
  });

  it('7×10 25mm on A4 → fits (single)', () => {
    const s = spec({ rows: 7, cols: 10, square: 25 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.fit).toBe('single');
  });
});

describe('computeLayout — brand block geometry', () => {
  it('wordmark is 42 mm wide on A4 (shorter dim 210)', () => {
    const s = spec({ rows: 10, cols: 7, square: 25 });
    const layout = computeLayout(s, 210, 297, 'portrait');
    expect(layout.brand.wmW).toBe(42);
    // Also in landscape — same wordmark width since shorter dim is still 210
    const layoutL = computeLayout(s, 210, 297, 'landscape');
    expect(layoutL.brand.wmW).toBe(42);
  });

  it('wordmark is at bottom-left inside margin', () => {
    const s = spec();
    const layout = computeLayout(s, 210, 297);
    expect(layout.brand.wmX).toBe(PAGE_MARGIN);
    expect(layout.brand.wmY).toBeGreaterThan(layout.ph - PAGE_MARGIN - 15);
    expect(layout.brand.wmY + layout.brand.wmH).toBeLessThanOrEqual(layout.ph - PAGE_MARGIN + 0.01);
  });

  it('text lines are to the right of the wordmark', () => {
    const s = spec();
    const layout = computeLayout(s, 210, 297);
    expect(layout.brand.textX).toBeGreaterThan(layout.brand.wmX + layout.brand.wmW);
  });

  it('entire brand block is inside page margins', () => {
    const s = spec();
    const layout = computeLayout(s, 210, 297);
    expect(layout.brand.wmX).toBeGreaterThanOrEqual(PAGE_MARGIN);
    expect(layout.brand.wmY + layout.brand.wmH).toBeLessThanOrEqual(layout.ph - PAGE_MARGIN + 0.01);
  });
});

describe('computeLayout — axes geometry', () => {
  it('axes origin is ≥ 8 mm from page edge', () => {
    const s = spec();
    const layout = computeLayout(s, 210, 297);
    expect(layout.axes.originX).toBeGreaterThanOrEqual(8);
    expect(layout.axes.originY).toBeGreaterThanOrEqual(8);
  });

  it('axes origin is near the pattern top-left corner', () => {
    // Use portrait so there's ample space above the pattern
    const s = spec({ rows: 10, cols: 7, square: 25 });
    const layout = computeLayout(s, 210, 297, 'portrait');
    // OpenCV: axes are above-left of pattern
    expect(layout.axes.originX).toBeLessThanOrEqual(layout.ox);
    expect(layout.axes.originY).toBeLessThanOrEqual(layout.oy);
  });

  it('X arrow endpoint + label fits inside page', () => {
    const s = spec();
    const layout = computeLayout(s, 210, 297);
    const xEnd = layout.axes.originX + layout.axes.arrowLen;
    expect(xEnd + 5).toBeLessThan(layout.pw); // 5 mm for "X" label
  });

  it('Y arrow endpoint fits inside page (OpenCV: downward)', () => {
    const s = spec();
    const layout = computeLayout(s, 210, 297);
    if (!layout.axes.isKalibr) {
      const yEnd = layout.axes.originY + layout.axes.arrowLen;
      expect(yEnd + 5).toBeLessThan(layout.ph);
    }
  });

  it('axes bounding box fully inside page', () => {
    const s = spec();
    const layout = computeLayout(s, 210, 297);
    const ax = layout.axes;
    // All axes elements must be > 0 and < pw/ph
    expect(ax.originX).toBeGreaterThan(0);
    expect(ax.originY).toBeGreaterThan(0);
    expect(ax.originX + ax.arrowLen + 5).toBeLessThan(layout.pw);
  });
});

describe('computeTiling', () => {
  it('320×240 on A4 → tiling with default overlap', () => {
    const tiling = computeTiling(320, 240, 210, 297);
    expect(tiling.totalPages).toBeGreaterThan(1);
    expect(tiling.overlapMm).toBe(10);
  });

  it('tiling for wide pattern uses landscape tiles', () => {
    const tiling = computeTiling(500, 200, 210, 297);
    // Pattern is wider → tiles should be landscape
    expect(tiling.tilePw).toBe(297); // long side as width
    expect(tiling.tilePh).toBe(210);
  });

  it('tiling for tall pattern uses portrait tiles', () => {
    const tiling = computeTiling(200, 500, 210, 297);
    expect(tiling.tilePw).toBe(210);
    expect(tiling.tilePh).toBe(297);
  });

  it('320×240 on A4 → default tiling 2×1 landscape sheets', () => {
    // A4 landscape: tilePw=297, tileW=297-20=277. 320 > 277 → need 2 cols
    // A4 landscape: tilePh=210, tileH=210-20=190. 240 > 190 → need 2 rows
    const tiling = computeTiling(320, 240, 210, 297);
    expect(tiling.cols).toBe(2);
    expect(tiling.rows).toBe(2);
    expect(tiling.totalPages).toBe(4);
  });
});

describe('computeGridReduction', () => {
  it('7×12 25mm on A4 — reduces cols to fit', () => {
    const s = spec({ rows: 7, cols: 12, square: 25, scaleBar: true });
    const reduced = computeGridReduction(s, 210, 297);
    expect(reduced.rows).toBeLessThanOrEqual(s.rows);
    expect(reduced.cols).toBeLessThanOrEqual(s.cols);
    expect(reduced.rows).toBeGreaterThanOrEqual(2);
    expect(reduced.cols).toBeGreaterThanOrEqual(2);
    // Should fit after reduction
    const bw = reduced.cols * s.square;
    const bh = reduced.rows * s.square;
    const fitsP = patternFits(bw, bh, 210, 297, true);
    const fitsL = patternFits(bw, bh, 297, 210, true);
    expect(fitsP || fitsL).toBe(true);
  });

  it('keeps both dims ≥ 2', () => {
    const s = spec({ rows: 100, cols: 100, square: 25 });
    const reduced = computeGridReduction(s, 210, 297);
    expect(reduced.rows).toBeGreaterThanOrEqual(2);
    expect(reduced.cols).toBeGreaterThanOrEqual(2);
  });
});

describe('smallestFittingPaper', () => {
  it('7×10 25mm fits on A4', () => {
    expect(smallestFittingPaper(250, 175, true, false)).toBe('A4');
  });

  it('large pattern needs A3 or bigger', () => {
    const result = smallestFittingPaper(350, 250, true, false);
    expect(result).not.toBe('A4');
    expect(result).not.toBeNull();
  });

  it('returns null when nothing fits', () => {
    expect(smallestFittingPaper(2000, 1500, true, false)).toBeNull();
  });
});

describe('fitNotice / reductionNotice', () => {
  it('fitNotice formats correctly', () => {
    expect(fitNotice(320, 240, 'A4')).toContain('320');
    expect(fitNotice(320, 240, 'A4')).toContain('A4');
    expect(fitNotice(320, 240, 'A4')).toContain('100');
  });

  it('reductionNotice formats correctly', () => {
    const n = reductionNotice(7, 12, 6, 9, 25);
    expect(n).toContain('7');
    expect(n).toContain('12');
    expect(n).toContain('6');
    expect(n).toContain('9');
    expect(n).toContain('25 mm');
  });
});
