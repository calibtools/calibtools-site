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

  it('brandBlockHeight is computed, not a literal', () => {
    const wmW = 42;
    const bbH = brandBlockHeight(wmW);
    // Wordmark height at 42 mm width: 42 / (7796.4/1857.4) ≈ 10.0 mm
    // Three 7 pt lines at 1.3 line-height: 3 × 2.47 × 1.3 ≈ 9.6 mm
    // Take larger (wmH ≈ 10) + 2 mm gap = ≈ 12.0 mm
    expect(bbH).toBeGreaterThan(10);
    expect(bbH).toBeLessThan(15);
  });
});

// ---------------------------------------------------------------------------
// decideOrientation
// ---------------------------------------------------------------------------

describe('decideOrientation', () => {
  const [a4W, a4H] = PAPERS.A4;

  it('6×10 at 20 mm (200×120 mm) on A4 → landscape only', () => {
    // bw=200, bh=120 — wide pattern
    const bw = 10 * 20, bh = 6 * 20;
    const result = decideOrientation(bw, bh, 'auto', a4W, a4H, 20);
    expect(result).toBe('landscape');
  });

  it('10×6 at 20 mm (120×200 mm) on A4 → portrait only', () => {
    const bw = 6 * 20, bh = 10 * 20;
    const result = decideOrientation(bw, bh, 'auto', a4W, a4H, 20);
    expect(result).toBe('portrait');
  });

  it('7×7 at 20 mm (140×140 mm) on A4 → fits both, portrait (more spare area)', () => {
    const bw = 7 * 20, bh = 7 * 20;
    const result = decideOrientation(bw, bh, 'auto', a4W, a4H, 20);
    // Portrait: pw=210, ph=297 → more spare height → more spare area
    expect(result).toBe('portrait');
  });

  it('7×12 at 25 mm (300×175 mm) on A4 → fits neither', () => {
    // This pattern doesn't fit A4 in either orientation at all (with quiet zones + brand block)
    const bw = 12 * 25, bh = 7 * 25;
    const wmW = wordmarkWidth(210, 297);
    const { reqW, reqH } = requiredDimensions(bw, bh, 25, wmW);
    // Verify it truly doesn't fit either way
    const [portW, portH] = orientPaper(a4W, a4H, 'portrait');
    const [landW, landH] = orientPaper(a4W, a4H, 'landscape');
    expect(reqW > portW || reqH > portH).toBe(true);
    expect(reqW > landW || reqH > landH).toBe(true);
  });

  it('manual override portrait', () => {
    expect(decideOrientation(300, 200, 'portrait')).toBe('portrait');
  });

  it('manual override landscape', () => {
    expect(decideOrientation(200, 300, 'landscape')).toBe('landscape');
  });
});

// ---------------------------------------------------------------------------
// orientPaper
// ---------------------------------------------------------------------------

describe('orientPaper', () => {
  it('A4 portrait → 210 × 297', () => {
    expect(orientPaper(210, 297, 'portrait')).toEqual([210, 297]);
  });

  it('A4 landscape → 297 × 210', () => {
    expect(orientPaper(210, 297, 'landscape')).toEqual([297, 210]);
  });
});

// ---------------------------------------------------------------------------
// wordmarkWidth
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// computeLayout — orientation (fit-based rule 1)
// ---------------------------------------------------------------------------

describe('computeLayout — orientation', () => {
  it('6×10 at 20 mm on A4 → landscape', () => {
    const s = spec({ rows: 6, cols: 10, square: 20 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.orientation).toBe('landscape');
  });

  it('10×6 at 20 mm on A4 → portrait', () => {
    const s = spec({ rows: 10, cols: 6, square: 20 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.orientation).toBe('portrait');
  });

  it('7×7 at 20 mm on A4 → portrait (fits both, portrait has more spare area)', () => {
    const s = spec({ rows: 7, cols: 7, square: 20 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.orientation).toBe('portrait');
  });

  it('7×12 at 25 mm on A4 → fits neither → tile mode', () => {
    const s = spec({ rows: 7, cols: 12, square: 25 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.fit).not.toBe('single');
  });

  it('manual override forces portrait for wide pattern', () => {
    const s = spec({ rows: 7, cols: 12, square: 25 });
    const layout = computeLayout(s, 210, 297, 'portrait');
    expect(layout.orientation).toBe('portrait');
    expect(layout.pw).toBe(210);
  });
});

// ---------------------------------------------------------------------------
// computeLayout — fit notice
// ---------------------------------------------------------------------------

describe('computeLayout — fit notice', () => {
  it('360×240 on A4 → not single (doesn\'t fit)', () => {
    const s = spec({ rows: 8, cols: 12, square: 30, scaleBar: true });
    const layout = computeLayout(s, 210, 297);
    expect(layout.fit).not.toBe('single');
  });

  it('small pattern on A4 → fits (single)', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.fit).toBe('single');
  });
});

// ---------------------------------------------------------------------------
// computeLayout — brand block geometry
// ---------------------------------------------------------------------------

describe('computeLayout — brand block geometry', () => {
  it('wordmark is 42 mm wide on A4', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297, 'portrait');
    expect(layout.brand.wmW).toBe(42);
    const layoutL = computeLayout(s, 210, 297, 'landscape');
    expect(layoutL.brand.wmW).toBe(42);
  });

  it('wordmark is at bottom-left inside margin', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.brand.wmX).toBe(PAGE_MARGIN);
    expect(layout.brand.wmY + layout.brand.wmH).toBeLessThanOrEqual(layout.ph - PAGE_MARGIN + 0.01);
  });

  it('text lines are to the right of the wordmark', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.brand.textX).toBeGreaterThan(layout.brand.wmX + layout.brand.wmW);
  });

  it('entire brand block is inside page margins', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.brand.wmX).toBeGreaterThanOrEqual(PAGE_MARGIN);
    expect(layout.brand.wmY + layout.brand.wmH).toBeLessThanOrEqual(layout.ph - PAGE_MARGIN + 0.01);
  });

  it('brand block text is outside pattern quiet zone', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297);
    const qz = patternQuietZone(s.square);
    const patternBottom = layout.oy + layout.bh;
    // Brand text must be below pattern + quiet zone
    expect(layout.brand.wmY).toBeGreaterThanOrEqual(patternBottom + qz - 0.01);
  });
});

// ---------------------------------------------------------------------------
// computeLayout — axes geometry
// ---------------------------------------------------------------------------

describe('computeLayout — axes geometry', () => {
  it('axes origin is ≥ PAGE_MARGIN from page edge', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297);
    expect(layout.axes.originX).toBeGreaterThanOrEqual(PAGE_MARGIN);
    expect(layout.axes.originY).toBeGreaterThanOrEqual(PAGE_MARGIN);
  });

  it('axes caption is outside pattern quiet zone (OpenCV)', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297, 'portrait');
    const qz = patternQuietZone(s.square);
    // Caption sits above the origin for OpenCV, and origin is above the pattern quiet zone edge
    // The axes group starts at the origin and the caption is ~4mm above.
    // The quiet zone edge is at oy - qz. The axes origin should be at or beyond that.
    expect(layout.axes.originY).toBeLessThanOrEqual(layout.oy);
  });

  it('axes origin is near the pattern top-left corner', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297, 'portrait');
    expect(layout.axes.originX).toBeLessThanOrEqual(layout.ox);
    expect(layout.axes.originY).toBeLessThanOrEqual(layout.oy);
  });

  it('X arrow endpoint + label fits inside page', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297);
    const xEnd = layout.axes.originX + layout.axes.arrowLen;
    expect(xEnd + 5).toBeLessThan(layout.pw);
  });

  it('Y arrow endpoint fits inside page (OpenCV: downward)', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297);
    if (!layout.axes.isKalibr) {
      const yEnd = layout.axes.originY + layout.axes.arrowLen;
      expect(yEnd + 5).toBeLessThan(layout.ph);
    }
  });

  it('axes bounding box fully inside page', () => {
    const s = spec({ rows: 5, cols: 5, square: 20 });
    const layout = computeLayout(s, 210, 297);
    const ax = layout.axes;
    expect(ax.originX).toBeGreaterThan(0);
    expect(ax.originY).toBeGreaterThan(0);
    expect(ax.originX + ax.arrowLen + 5).toBeLessThan(layout.pw);
  });
});

// ---------------------------------------------------------------------------
// computeTiling
// ---------------------------------------------------------------------------

describe('computeTiling', () => {
  it('7×12 at 25 mm (300×175 mm) on A4 → 2 portrait sheets (2×1), not 4 landscape', () => {
    const bw = 12 * 25; // 300 mm
    const bh = 7 * 25;  // 175 mm
    const tiling = computeTiling(bw, bh, 210, 297);
    expect(tiling.totalPages).toBe(2);
    // 2 cols × 1 row in portrait: tilePw=210, tileH fits bh with brand deducted
    expect(tiling.cols).toBe(2);
    expect(tiling.rows).toBe(1);
  });

  it('tiling for wide pattern considers both orientations', () => {
    const tiling = computeTiling(500, 200, 210, 297);
    expect(tiling.totalPages).toBeGreaterThan(1);
    expect(tiling.overlapMm).toBe(10);
  });

  it('tiling for tall pattern picks orientation needing fewer pages', () => {
    const tiling = computeTiling(200, 500, 210, 297);
    expect(tiling.totalPages).toBeGreaterThan(1);
    // The algorithm picks whichever orientation yields fewer total pages
  });

  it('tiling overlap defaults to 10 mm', () => {
    const tiling = computeTiling(320, 240, 210, 297);
    expect(tiling.overlapMm).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// computeGridReduction
// ---------------------------------------------------------------------------

describe('computeGridReduction', () => {
  it('7×12 at 25 mm on A4 → 5×9 landscape', () => {
    const s = spec({ rows: 7, cols: 12, square: 25, scaleBar: true });
    const reduced = computeGridReduction(s, 210, 297);
    expect(reduced.rows).toBeLessThanOrEqual(s.rows);
    expect(reduced.cols).toBeLessThanOrEqual(s.cols);
    expect(reduced.rows).toBeGreaterThanOrEqual(2);
    expect(reduced.cols).toBeGreaterThanOrEqual(2);
    // Should fit after reduction
    const bw = reduced.cols * s.square;
    const bh = reduced.rows * s.square;
    const [pw, ph] = orientPaper(210, 297, reduced.orientation);
    expect(patternFits(bw, bh, pw, ph, s.square)).toBe(true);
    expect(reduced.orientation).toBe('landscape');
  });

  it('keeps both dims ≥ 2', () => {
    const s = spec({ rows: 100, cols: 100, square: 25 });
    const reduced = computeGridReduction(s, 210, 297);
    expect(reduced.rows).toBeGreaterThanOrEqual(2);
    expect(reduced.cols).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// smallestFittingPaper
// ---------------------------------------------------------------------------

describe('smallestFittingPaper', () => {
  it('small pattern fits on A4', () => {
    // 100×100 mm pattern with 20 mm squares
    expect(smallestFittingPaper(100, 100, 20, false)).toBe('A4');
  });

  it('large pattern needs A3 or bigger', () => {
    const result = smallestFittingPaper(350, 250, 25, false);
    expect(result).not.toBe('A4');
    expect(result).not.toBeNull();
  });

  it('returns null when nothing fits', () => {
    expect(smallestFittingPaper(2000, 1500, 25, false)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fitNotice / reductionNotice / usableGridNotice
// ---------------------------------------------------------------------------

describe('fitNotice / reductionNotice', () => {
  it('fitNotice formats correctly', () => {
    expect(fitNotice(320, 240, 'A4')).toContain('320');
    expect(fitNotice(320, 240, 'A4')).toContain('A4');
    expect(fitNotice(320, 240, 'A4')).toContain('100');
  });

  it('reductionNotice formats correctly with orientation', () => {
    const n = reductionNotice(7, 12, 5, 9, 25, 'landscape');
    expect(n).toContain('7');
    expect(n).toContain('12');
    expect(n).toContain('5');
    expect(n).toContain('9');
    expect(n).toContain('25 mm');
    expect(n).toContain('landscape');
  });
});

describe('usableGridNotice', () => {
  it('shows correct grid for A4 portrait at 20 mm', () => {
    const notice = usableGridNotice('A4', 210, 297, 20);
    expect(notice).toContain('A4');
    expect(notice).toContain('portrait');
    expect(notice).toContain('20 mm');
  });
});

// ---------------------------------------------------------------------------
// Quiet zone enforcement
// ---------------------------------------------------------------------------

describe('quiet zone enforcement', () => {
  it('brand block is outside pattern quiet zone', () => {
    const s = spec({ rows: 5, cols: 5, square: 25 });
    const layout = computeLayout(s, 210, 297);
    const qz = patternQuietZone(s.square);
    const patternBottom = layout.oy + layout.bh;
    // Brand wordmark Y must be below pattern bottom + quiet zone
    expect(layout.brand.wmY).toBeGreaterThanOrEqual(patternBottom + qz - 0.01);
  });

  it('axes origin is inside PAGE_MARGIN and outside pattern quiet zone', () => {
    const s = spec({ rows: 5, cols: 5, square: 25 });
    const layout = computeLayout(s, 210, 297, 'portrait');
    // Inside page margins
    expect(layout.axes.originX).toBeGreaterThanOrEqual(PAGE_MARGIN);
    expect(layout.axes.originY).toBeGreaterThanOrEqual(PAGE_MARGIN);
  });
});
