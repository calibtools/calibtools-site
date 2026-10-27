/**
 * Page layout computation for pattern exports.
 *
 * Single source of truth for orientation, margins, brand-block placement,
 * axes placement, fit checking, tiling, and grid reduction.
 * All three exporters (PDF, SVG, DXF) and the Generator UI import from here.
 */

import type { PatternSpec } from './patterns';
import { WORDMARK_VB } from './exportBrand';

// ---------------------------------------------------------------------------
// Standard paper sizes (mm) — always stored as [short, long]
// ---------------------------------------------------------------------------

export const PAPERS: Record<string, [number, number]> = {
  A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189],
  Letter: [215.9, 279.4], Tabloid: [279.4, 431.8],
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum page margin on all sides (mm). */
export const PAGE_MARGIN = 10;

/** Minimum clearance between pattern bottom and brand block top (mm).
 *  Scale bar lives in this gap. */
export const PATTERN_CLEARANCE = 4;

/** Wordmark width on A4/Letter (mm). Scaled proportionally for other sizes. */
const WM_WIDTH_A4 = 42;

/** Minimum wordmark width (mm). */
const WM_WIDTH_MIN = 36;

/** Wordmark aspect ratio (width / height). */
const WM_ASPECT = WORDMARK_VB.width / WORDMARK_VB.height; // ≈ 4.197

/** Brand block height: wordmark + 3 text lines at 7 pt with 3 mm spacing. */
const BRAND_TEXT_SIZE = 2.47; // 7 pt in mm (7 × 25.4/72)
const BRAND_LINE_SPACING = 3; // mm between text baselines

/** Height of the brand block (wordmark height + text lines). */
function brandBlockHeight(wmH: number): number {
  // wordmark + gap + 3 text lines
  return wmH + 2 + 3 * BRAND_LINE_SPACING;
}

/** Tiling overlap (mm). */
export const TILE_OVERLAP = 10;

/** Assembly note for tiled exports. */
export const TILE_ASSEMBLY_NOTE =
  'Align crop marks, tape on the back, mount on a flat board \u2014 seams add error';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Orientation = 'auto' | 'portrait' | 'landscape';
export type FitMode = 'single' | 'tile' | 'reduce' | 'upsize';

export interface BrandGeometry {
  wmX: number;  wmY: number;  wmW: number;  wmH: number;
  textX: number; textY: number; // first text line baseline
  textLineH: number; // line spacing for subsequent lines
}

export interface AxesGeometry {
  originX: number;
  originY: number;
  arrowLen: number;
  headLen: number;
  headW: number;
  shaft: number;
  isKalibr: boolean;
}

export interface TilingLayout {
  cols: number;
  rows: number;
  overlapMm: number;
  tileW: number;     // printable area per tile (mm)
  tileH: number;
  tilePw: number;    // tile page width (mm)
  tilePh: number;    // tile page height (mm)
  totalPages: number;
}

export interface PageLayout {
  pw: number;
  ph: number;
  ox: number;
  oy: number;
  bw: number;
  bh: number;
  orientation: 'portrait' | 'landscape';
  fit: FitMode;
  tiling?: TilingLayout;
  reducedSpec?: { rows: number; cols: number };
  upsizePaper?: string;
  brand: BrandGeometry;
  axes: AxesGeometry;
  margin: number;
}

// ---------------------------------------------------------------------------
// Orientation
// ---------------------------------------------------------------------------

/**
 * Decide page orientation.
 *
 * `auto` (default): landscape when the pattern is wider than tall (after
 * accounting for the brand block and margins), portrait otherwise.
 * Manual override forces the named orientation.
 */
export function decideOrientation(
  bw: number,
  bh: number,
  orient: Orientation = 'auto',
): 'portrait' | 'landscape' {
  if (orient === 'portrait') return 'portrait';
  if (orient === 'landscape') return 'landscape';
  // auto: landscape when pattern is wider than tall
  return bw > bh ? 'landscape' : 'portrait';
}

/**
 * Orient a paper size: returns [pw, ph] with the short side as width
 * for portrait, or the long side as width for landscape.
 */
export function orientPaper(
  paperW: number,
  paperH: number,
  orientation: 'portrait' | 'landscape',
): [number, number] {
  const short = Math.min(paperW, paperH);
  const long = Math.max(paperW, paperH);
  return orientation === 'landscape' ? [long, short] : [short, long];
}

// ---------------------------------------------------------------------------
// Wordmark sizing
// ---------------------------------------------------------------------------

/**
 * Compute wordmark width for a given page size.
 * 42 mm on A4/Letter, proportionally scaled for other sizes, minimum 36 mm.
 * Uses the shorter page dimension as reference to avoid oversized brand blocks
 * on landscape pages.
 */
export function wordmarkWidth(pw: number, ph: number): number {
  // Reference: A4 short side = 210 mm → 42 mm wordmark.
  const refDim = Math.min(pw, ph);
  const scale = refDim / 210;
  return Math.max(WM_WIDTH_MIN, Math.round(WM_WIDTH_A4 * scale * 10) / 10);
}

// ---------------------------------------------------------------------------
// Fit checking
// ---------------------------------------------------------------------------

/**
 * Check whether a pattern fits on a single page at 100% scale.
 * Accounts for margins and scale bar. The brand block degrades gracefully
 * (compact → omitted) when vertical space is tight, so it's not a hard constraint.
 */
export function patternFits(
  bw: number,
  bh: number,
  pw: number,
  ph: number,
  scaleBar: boolean,
): boolean {
  const availW = pw - 2 * PAGE_MARGIN;
  const availH = ph - 2 * PAGE_MARGIN - (scaleBar ? 14 : 0);
  return bw <= availW && bh <= availH;
}

// ---------------------------------------------------------------------------
// Tiling
// ---------------------------------------------------------------------------

/**
 * Compute tiling layout for a pattern that doesn't fit on one sheet.
 */
export function computeTiling(
  bw: number,
  bh: number,
  paperW: number,
  paperH: number,
  overlapMm = TILE_OVERLAP,
): TilingLayout {
  // Tile orientation follows the pattern: landscape if pattern wider than tall
  const tileOrientation = bw > bh ? 'landscape' : 'portrait';
  const [tilePw, tilePh] = orientPaper(paperW, paperH, tileOrientation);

  // Printable area per tile (excluding margins on page edges)
  const tileW = tilePw - 2 * PAGE_MARGIN;
  const tileH = tilePh - 2 * PAGE_MARGIN;

  // How many tiles needed in each direction?
  // First tile covers tileW, each additional tile adds (tileW - overlapMm)
  const cols = tileW >= bw ? 1 : 1 + Math.ceil((bw - tileW) / (tileW - overlapMm));
  const rows = tileH >= bh ? 1 : 1 + Math.ceil((bh - tileH) / (tileH - overlapMm));

  return {
    cols, rows, overlapMm,
    tileW, tileH,
    tilePw, tilePh,
    totalPages: cols * rows,
  };
}

// ---------------------------------------------------------------------------
// Grid reduction
// ---------------------------------------------------------------------------

/**
 * Compute the largest grid (rows × cols) that fits one page,
 * keeping the square size unchanged.
 */
export function computeGridReduction(
  spec: PatternSpec,
  paperW: number,
  paperH: number,
): { rows: number; cols: number } {
  // Try both orientations and pick the one that fits more cells
  let bestRows = 2, bestCols = 2;

  for (const orient of ['portrait', 'landscape'] as const) {
    const [pw, ph] = orientPaper(paperW, paperH, orient);
    const availW = pw - 2 * PAGE_MARGIN;
    const availH = ph - 2 * PAGE_MARGIN - (spec.scaleBar ? 14 : 0);
    const maxCols = Math.floor(availW / spec.square);
    const maxRows = Math.floor(availH / spec.square);
    const r = Math.min(spec.rows, Math.max(2, maxRows));
    const c = Math.min(spec.cols, Math.max(2, maxCols));
    if (r * c > bestRows * bestCols) {
      bestRows = r;
      bestCols = c;
    }
  }

  return { rows: bestRows, cols: bestCols };
}

// ---------------------------------------------------------------------------
// Smallest fitting paper
// ---------------------------------------------------------------------------

/**
 * Find the smallest standard paper that fits the pattern at 100%.
 * Returns paper name or null if none fits.
 */
export function smallestFittingPaper(
  bw: number,
  bh: number,
  scaleBar: boolean,
  isInch: boolean,
): string | null {
  const candidates = isInch
    ? ['Letter', 'Tabloid']
    : ['A4', 'A3', 'A2', 'A1', 'A0'];

  for (const name of candidates) {
    const [pW, pH] = PAPERS[name];
    // Try both orientations
    for (const orient of ['portrait', 'landscape'] as const) {
      const [pw, ph] = orientPaper(pW, pH, orient);
      if (patternFits(bw, bh, pw, ph, scaleBar)) {
        return name;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main layout computation
// ---------------------------------------------------------------------------

/**
 * Compute the full page layout for a given pattern and paper size.
 */
export function computeLayout(
  spec: PatternSpec,
  paperW: number,
  paperH: number,
  orientOverride: Orientation = 'auto',
): PageLayout {
  const bw = spec.cols * spec.square;
  const bh = spec.rows * spec.square;

  // Orientation
  const orientation = decideOrientation(bw, bh, orientOverride);
  const [pw, ph] = orientPaper(paperW, paperH, orientation);

  // Brand block sizing
  const wmW = wordmarkWidth(pw, ph);
  const wmH = wmW / WM_ASPECT;
  const bbH = brandBlockHeight(wmH);

  // Check fit
  const fits = patternFits(bw, bh, pw, ph, spec.scaleBar);
  const isInch = paperW < 220 && paperH < 300; // rough heuristic for US sizes

  let fit: FitMode = 'single';
  let tiling: TilingLayout | undefined;
  let reducedSpec: { rows: number; cols: number } | undefined;
  let upsizePaper: string | undefined;

  if (!fits) {
    fit = 'tile'; // default recommendation
    tiling = computeTiling(bw, bh, paperW, paperH);
    reducedSpec = computeGridReduction(spec, paperW, paperH);
    upsizePaper = smallestFittingPaper(bw, bh, spec.scaleBar, isInch) ?? undefined;
  }

  // Pattern placement — centred on page, shifted up slightly for scale bar
  const scaleBarH = spec.scaleBar ? 14 : 0;
  const ox = (pw - bw) / 2;
  const oy = (ph - bh) / 2 - scaleBarH / 2;

  // Brand block — bottom-left inside margins
  const brandWmX = PAGE_MARGIN;
  const brandWmY = ph - PAGE_MARGIN - wmH;
  const brandTextX = PAGE_MARGIN + wmW + 4; // 4 mm gap right of wordmark
  const brandTextY = brandWmY + 2; // align top of first line with top of wordmark + small offset

  const brand: BrandGeometry = {
    wmX: brandWmX,
    wmY: brandWmY,
    wmW,
    wmH,
    textX: brandTextX,
    textY: brandTextY,
    textLineH: BRAND_LINE_SPACING,
  };

  // Axes — clamped so arrows + labels stay inside printable area
  const isKalibr = spec.type === 'AprilGrid (Kalibr)' && (spec.symmetricCorners ?? false);
  const shorter = Math.min(bw, bh);
  const arrowLen = Math.max(15, Math.min(40, shorter * 0.15));
  const headLen = Math.min(3, arrowLen * 0.2);
  const headW = headLen * 0.6;
  const shaft = 0.4;

  // Ideal origin: 0.5 squares before pattern top-left (or bottom-left for Kalibr)
  const idealAxOx = ox - 0.5 * spec.square;
  const idealAxOy = isKalibr ? oy + bh + 0.5 * spec.square : oy - 0.5 * spec.square;

  // Clamp so the full axes block (origin→tip + labels) stays ≥ 8 mm from page edge
  const minEdge = PAGE_MARGIN - 2; // 8 mm from page edge
  // X: origin can't go below minEdge, and Y arrow may extend down from origin
  const axOriginX = Math.max(minEdge, idealAxOx);
  let axOriginY: number;
  if (isKalibr) {
    // Kalibr: origin below pattern, Y arrow goes up
    axOriginY = Math.min(ph - minEdge, idealAxOy);
  } else {
    // OpenCV: origin above pattern, Y arrow goes down
    // Caption is above origin (~4 mm), so origin needs ≥ minEdge + 4
    axOriginY = Math.max(minEdge + 4, idealAxOy);
  }

  const axes: AxesGeometry = {
    originX: axOriginX,
    originY: axOriginY,
    arrowLen,
    headLen,
    headW,
    shaft,
    isKalibr,
  };

  return {
    pw, ph, ox, oy, bw, bh,
    orientation, fit,
    tiling, reducedSpec, upsizePaper,
    brand, axes, margin: PAGE_MARGIN,
  };
}

/**
 * Human-readable fit notice for the UI.
 * E.g. "Pattern 320 × 240 mm does not fit A4 at 100 %."
 */
export function fitNotice(bw: number, bh: number, paperName: string): string {
  return `Pattern ${bw} \u00D7 ${bh} mm does not fit ${paperName} at 100 %.`;
}

/**
 * Human-readable grid reduction description.
 * E.g. "7 × 12 → 6 × 9, squares stay 25 mm"
 */
export function reductionNotice(
  origRows: number,
  origCols: number,
  newRows: number,
  newCols: number,
  square: number,
): string {
  return `${origRows} \u00D7 ${origCols} \u2192 ${newRows} \u00D7 ${newCols}, squares stay ${square} mm`;
}
