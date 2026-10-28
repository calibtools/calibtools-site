import { describe, it, expect } from 'vitest';
import {
  PAPERS,
  PAGE_MARGIN,
  computeLayout,
  computeTiling,
  computeGridReduction,
  smallestFittingPaper,
  patternFits,
  patternQuietZone,
  brandBlockHeight,
  wordmarkClearSpace,
  decideOrientation,
  orientPaper,
  wordmarkWidth,
  fitNotice,
  reductionNotice,
  requiredDimensions,
  usableGridNotice,
  BRAND_LINE_SPACING,
  BRAND_TEXT_SIZE_MM,
} from './pageLayout';
import { WORDMARK_VB } from './exportBrand';
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

// Derived constants — computed inside the test, not typed as literals.
const WM_ASPECT = WORDMARK_VB.width / WORDMARK_VB.height;
const [a4W, a4H] = PAPERS.A4;

function wmWidthForA4(): number { return wordmarkWidth(a4W, a4H); }
function wmHeightForA4(): number { return wmWidthForA4() / WM_ASPECT; }
function clearSpaceForA4(): number { return wordmarkClearSpace(wmHeightForA4()); }
function bbHeightForA4(): number { return brandBlockHeight(wmWidthForA4()); }

// ---------------------------------------------------------------------------
// Constants validation
// ---------------------------------------------------------------------------

describe('layout constants', () => {
  it('PAGE_MARGIN = 8 mm', () => {
    expect(PAGE_MARGIN).toBe(8);
  });

  it('patternQuietZone = max(square, 10)', () => {
    expect(patternQuietZone(5)).toBe(10);
    expect(patternQuietZone(10)).toBe(10);
    expect(patternQuietZone(20)).toBe(20);
    expect(patternQuietZone(25)).toBe(25);
  });

  it('wordmark sized by ISO 3098 cap height 2.5 mm on A4', () => {
    // 2.5 × 7174.4 / 710 ≈ 25.3 mm
    const wmW = wordmarkWidth(a4W, a4H);
    expect(wmW).toBeCloseTo(25.3, 0);
    // Landscape — uses shorter dim, same result
    expect(wordmarkWidth(a4H, a4W)).toBe(wmW);
  });

  it('wordmark scaled to 3.5 mm cap height on A3+', () => {
    const [a3W, a3H] = PAPERS.A3;
    // 3.5 × 7174.4 / 710 ≈ 35.4 mm
    expect(wordmarkWidth(a3W, a3H)).toBeCloseTo(35.4, 0);
  });

  it('wordmark cap height from aspect ratio', () => {
    const wmW = wordmarkWidth(a4W, a4H);
    const wmH = wmW / WM_ASPECT;
    // viewBox height maps to ~2.72 mm, cap height = 2.5 mm
    expect(wmH).toBeCloseTo(2.72, 1);
  });

  it('clear space = cap height (§04)', () => {
    const wmW = wordmarkWidth(a4W, a4H);
    const wmH = wmW / WM_ASPECT;
    const cs = wordmarkClearSpace(wmH);
    // Cap height = wmH × 710 / 770.4 ≈ 2.5 mm
    expect(cs).toBeCloseTo(2.5, 1);
  });

  it('brand text = ISO 3098 2.5 mm tier', () => {
    expect(BRAND_TEXT_SIZE_MM).toBe(2.5);
  });

  it('brandBlockHeight governed by 3 text lines at 2.5 mm', () => {
    const wmW = wordmarkWidth(a4W, a4H);
    const wmH = wmW / WM_ASPECT;
    const cs = wordmarkClearSpace(wmH);
    const wordmarkBlock = wmH + cs;
    const textBlock = 3 * BRAND_TEXT_SIZE_MM * 1.3;
    expect(brandBlockHeight(wmW)).toBeCloseTo(Math.max(wordmarkBlock, textBlock), 2);
  });
});

// ---------------------------------------------------------------------------
// decideOrientation — expected values computed from constants
// ---------------------------------------------------------------------------

describe('decideOrientation', () => {
  it('6×10 at 20 mm on A4 → landscape only', () => {
    const bw = 10 * 20, bh = 6 * 20;
    expect(decideOrientation(bw, bh, 'auto', a4W, a4H, 20)).toBe('landscape');
  });

  it('10×6 at 20 mm on A4 → portrait only', () => {
    const bw = 6 * 20, bh = 10 * 20;
    expect(decideOrientation(bw, bh, 'auto', a4W, a4H, 20)).toBe('portrait');
  });

  it('7×7 at 20 mm on A4 → fits both → portrait (more spare area)', () => {
    const bw = 7 * 20, bh = 7 * 20;
    expect(decideOrientation(bw, bh, 'auto', a4W, a4H, 20)).toBe('portrait');
  });

  it('7×12 at 25 mm on A4 → none (fits neither)', () => {
    const bw = 12 * 25, bh = 7 * 25;
    expect(decideOrientation(bw, bh, 'auto', a4W, a4H, 25)).toBe('none');
  });

  it('manual override portrait', () => {
    expect(decideOrientation(300, 200, 'portrait')).toBe('portrait');
  });

  it('manual override landscape', () => {
    expect(decideOrientation(200, 300, 'landscape')).toBe('landscape');
  });
});

// ---------------------------------------------------------------------------
// computeLayout — orientation
// ---------------------------------------------------------------------------

describe('computeLayout — orientation', () => {
  it('6×10 at 20 mm on A4 → landscape', () => {
    const s = spec({ rows: 6, cols: 10, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    expect(layout.orientation).toBe('landscape');
    expect(layout.fit).toBe('single');
  });

  it('10×6 at 20 mm on A4 → portrait', () => {
    const s = spec({ rows: 10, cols: 6, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    expect(layout.orientation).toBe('portrait');
    expect(layout.fit).toBe('single');
  });

  it('7×7 at 20 mm on A4 → portrait (fits both, more spare area)', () => {
    const s = spec({ rows: 7, cols: 7, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    expect(layout.orientation).toBe('portrait');
    expect(layout.fit).toBe('single');
  });

  it('7×12 at 25 mm on A4 → fits neither → tile mode', () => {
    const s = spec({ rows: 7, cols: 12, square: 25 });
    const layout = computeLayout(s, a4W, a4H);
    expect(layout.fit).toBe('tile');
    expect(layout.tiling).toBeDefined();
  });

  it('manual override forces portrait', () => {
    const s = spec({ rows: 7, cols: 12, square: 25 });
    const layout = computeLayout(s, a4W, a4H, 'portrait');
    expect(layout.orientation).toBe('portrait');
    expect(layout.pw).toBe(210);
  });
});

// ---------------------------------------------------------------------------
// computeTiling — rule 3
// ---------------------------------------------------------------------------

describe('computeTiling', () => {
  it('7×12 at 25 mm on A4 → portrait 2×1 = 2 sheets (not 4 landscape)', () => {
    const bw = 12 * 25; // 300 mm
    const bh = 7 * 25;  // 175 mm
    const tiling = computeTiling(bw, bh, a4W, a4H);
    expect(tiling.totalPages).toBe(2);
    expect(tiling.cols).toBe(2);
    expect(tiling.rows).toBe(1);
    expect(tiling.orientation).toBe('portrait');
  });

  it('picks fewer sheets between orientations', () => {
    const tiling = computeTiling(500, 200, a4W, a4H);
    expect(tiling.totalPages).toBeGreaterThan(1);
    expect(tiling.overlapMm).toBe(10);
  });

  it('tiling overlap defaults to 10 mm', () => {
    const tiling = computeTiling(320, 240, a4W, a4H);
    expect(tiling.overlapMm).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// computeGridReduction — rule 4
// ---------------------------------------------------------------------------

describe('computeGridReduction', () => {
  it('7×12 at 25 mm on A4 → 5 rows × 9 cols landscape', () => {
    const s = spec({ rows: 7, cols: 12, square: 25 });
    const reduced = computeGridReduction(s, a4W, a4H);
    expect(reduced.rows).toBe(5);
    expect(reduced.cols).toBe(9);
    expect(reduced.orientation).toBe('landscape');
    // Verify it fits
    const bw = reduced.cols * s.square;
    const bh = reduced.rows * s.square;
    const [pw, ph] = orientPaper(a4W, a4H, reduced.orientation);
    expect(patternFits(bw, bh, pw, ph, s.square)).toBe(true);
  });

  it('keeps both dims ≥ 2', () => {
    const s = spec({ rows: 100, cols: 100, square: 25 });
    const reduced = computeGridReduction(s, a4W, a4H);
    expect(reduced.rows).toBeGreaterThanOrEqual(2);
    expect(reduced.cols).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Brand block geometry — rule 1
// ---------------------------------------------------------------------------

describe('computeLayout — brand block geometry', () => {
  it('wordmark sized by ISO 3098 cap height on A4', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H, 'portrait');
    expect(layout.brand.wmW).toBeCloseTo(25.3, 0);
  });

  it('wordmark at bottom-left inside margin', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    expect(layout.brand.wmX).toBe(PAGE_MARGIN);
    expect(layout.brand.wmY + layout.brand.wmH).toBeLessThanOrEqual(layout.ph - PAGE_MARGIN + 0.01);
  });

  it('text column starts CLEAR_SPACE right of wordmark', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    const cs = wordmarkClearSpace(layout.brand.wmH);
    expect(layout.brand.textX).toBeCloseTo(PAGE_MARGIN + layout.brand.wmW + cs, 1);
  });

  it('brand block outside quiet zone', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    const patternBottom = layout.oy + layout.bh;
    expect(layout.brand.wmY).toBeGreaterThanOrEqual(patternBottom + layout.quietZone - 0.01);
  });

  it('entire brand block inside page margins', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    expect(layout.brand.wmX).toBeGreaterThanOrEqual(PAGE_MARGIN);
    expect(layout.brand.wmY + layout.brand.wmH).toBeLessThanOrEqual(layout.ph - PAGE_MARGIN + 0.01);
  });
});

// ---------------------------------------------------------------------------
// Axes geometry
// ---------------------------------------------------------------------------

describe('computeLayout — axes geometry', () => {
  it('axes origin ≥ PAGE_MARGIN from page edge', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    expect(layout.axes.originX).toBeGreaterThanOrEqual(PAGE_MARGIN);
    expect(layout.axes.originY).toBeGreaterThanOrEqual(PAGE_MARGIN);
  });

  it('axes origin ≤ pattern top-left (OpenCV)', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H, 'portrait');
    expect(layout.axes.originX).toBeLessThanOrEqual(layout.ox);
    expect(layout.axes.originY).toBeLessThanOrEqual(layout.oy);
  });

  it('X arrow + label fits inside page', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    expect(layout.axes.originX + layout.axes.arrowLen + 5).toBeLessThan(layout.pw);
  });

  it('Y arrow fits inside page (OpenCV: downward)', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    if (!layout.axes.isKalibr) {
      expect(layout.axes.originY + layout.axes.arrowLen + 5).toBeLessThan(layout.ph);
    }
  });
});

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

describe('smallestFittingPaper', () => {
  it('small pattern fits A4', () => {
    expect(smallestFittingPaper(100, 100, 20, false)).toBe('A4');
  });

  it('large pattern needs A3+', () => {
    const r = smallestFittingPaper(350, 250, 25, false);
    expect(r).not.toBe('A4');
    expect(r).not.toBeNull();
  });

  it('returns null when nothing fits', () => {
    expect(smallestFittingPaper(2000, 1500, 25, false)).toBeNull();
  });
});

describe('fitNotice / reductionNotice', () => {
  it('fitNotice includes dimensions and paper', () => {
    const n = fitNotice(320, 240, 'A4');
    expect(n).toContain('320');
    expect(n).toContain('A4');
    expect(n).toContain('100');
  });

  it('reductionNotice includes orientation', () => {
    const n = reductionNotice(7, 12, 5, 9, 25, 'landscape');
    expect(n).toContain('5');
    expect(n).toContain('9');
    expect(n).toContain('25 mm');
    expect(n).toContain('landscape');
  });
});

describe('usableGridNotice', () => {
  it('A4 portrait at 20 mm', () => {
    const n = usableGridNotice('A4', 210, 297, 20);
    expect(n).toContain('A4');
    expect(n).toContain('portrait');
    expect(n).toContain('20 mm');
  });
});

// ---------------------------------------------------------------------------
// Quiet zone enforcement
// ---------------------------------------------------------------------------

describe('quiet zone enforcement', () => {
  it('brand block outside quiet zone (single-page)', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H);
    expect(layout.fit).toBe('single');
    const patternBottom = layout.oy + layout.bh;
    expect(layout.brand.wmY).toBeGreaterThanOrEqual(patternBottom + layout.quietZone - 0.01);
  });

  it('axes inside margin', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, a4W, a4H, 'portrait');
    expect(layout.axes.originX).toBeGreaterThanOrEqual(PAGE_MARGIN);
    expect(layout.axes.originY).toBeGreaterThanOrEqual(PAGE_MARGIN);
  });
});
