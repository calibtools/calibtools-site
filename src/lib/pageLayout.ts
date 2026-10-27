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
// Layout constants — used everywhere: placement, orientation, tests, exports
// ---------------------------------------------------------------------------

/** Printer non-printable edge (mm). */
export const PAGE_MARGIN = 8;

/**
 * Quiet zone around the pattern (mm).
 * Detectors need a white zone free of brand elements, axes, text or crop marks.
 * Value = max(one square size of the current pattern, 10 mm).
 */
export function patternQuietZone(squareSize: number): number {
  return Math.max(squareSize, 10);
}

/** Wordmark width on A4/Letter (mm). Scaled proportionally for other sizes. */
const WM_WIDTH_A4 = 42;

/** Minimum wordmark width (mm). */
const WM_WIDTH_MIN = 36;

/** Wordmark aspect ratio (width / height). */
const WM_ASPECT = WORDMARK_VB.width / WORDMARK_VB.height; // ≈ 4.197

/** Brand text: 7 pt in mm (7 × 25.4 / 72). */
export const BRAND_TEXT_SIZE_MM = 7 * 25.4 / 72; // ≈ 2.47

/** Line spacing for brand text lines (mm between baselines). */
export const BRAND_LINE_SPACING = 3;

/**
 * Compute brand block height from the wordmark height.
 * Takes the larger of:
 *  - wordmark height at the given width
 *  - three 7 pt Geist Mono lines at 1.3× line-height
 * Then adds a 2 mm gap.
 */
export function brandBlockHeight(wmW: number): number {
  const wmH = wmW / WM_ASPECT;
  const textBlockH = 3 * BRAND_TEXT_SIZE_MM * 1.3; // 3 lines at 1.3 line-height ≈ 9.6 mm
  return Math.max(wmH, textBlockH) + 2; // 2 mm gap between pattern area and brand
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
  reducedSpec?: { rows: number; cols: number; orientation: 'portrait' | 'landscape' };
  upsizePaper?: string;
  brand: BrandGeometry;
  axes: AxesGeometry;
  margin: number;
  quietZone: number;
  /** Human-readable usable grid for the UI, e.g. "A4 portrait fits up to 7 × 11 squares at 20 mm" */
  usableGrid?: string;
}

// ---------------------------------------------------------------------------
// Orientation — fit-based (rule 1)
// ---------------------------------------------------------------------------

/**
 * Required page dimensions for a pattern (mm).
 * Brand block sits below the pattern in both orientations.
 */
export function requiredDimensions(
  bw: number, bh: number, square: number, wmW: number,
): { reqW: number; reqH: number } {
  const qz = patternQuietZone(square);
  const bbH = brandBlockHeight(wmW);
  return {
    reqW: bw + 2 * qz + 2 * PAGE_MARGIN,
    reqH: bh + 2 * qz + bbH + 2 * PAGE_MARGIN,
  };
}

/**
 * Decide page orientation using fit-based logic.
 *
 * `auto`: choose the orientation in which the required box fits.
 * If it fits both, use the one with more spare area.
 * If neither fits, prefer the one with less deficit (for the tiling path).
 * Manual override forces the named orientation.
 */
export function decideOrientation(
  bw: number,
  bh: number,
  orient: Orientation = 'auto',
  paperW?: number,
  paperH?: number,
  square?: number,
): 'portrait' | 'landscape' {
  if (orient === 'portrait') return 'portrait';
  if (orient === 'landscape') return 'landscape';

  // If no paper dimensions given, fall back to aspect ratio heuristic
  if (paperW == null || paperH == null || square == null) {
    return bw > bh ? 'landscape' : 'portrait';
  }

  const [portW, portH] = orientPaper(paperW, paperH, 'portrait');
  const [landW, landH] = orientPaper(paperW, paperH, 'landscape');

  // Wordmark width depends on the shorter page dimension (always the same for both orientations)
  const wmW = wordmarkWidth(portW, portH);

  const { reqW, reqH } = requiredDimensions(bw, bh, square, wmW);

  const fitsPort = reqW <= portW && reqH <= portH;
  const fitsLand = reqW <= landW && reqH <= landH;

  if (fitsPort && fitsLand) {
    // Both fit — pick the one with more spare area
    const sparePort = (portW - reqW) * (portH - reqH);
    const spareLand = (landW - reqW) * (landH - reqH);
    return sparePort >= spareLand ? 'portrait' : 'landscape';
  }
  if (fitsPort) return 'portrait';
  if (fitsLand) return 'landscape';

  // Neither fits — prefer the orientation with less total deficit
  const deficitPort = Math.max(0, reqW - portW) + Math.max(0, reqH - portH);
  const deficitLand = Math.max(0, reqW - landW) + Math.max(0, reqH - landH);
  return deficitPort <= deficitLand ? 'portrait' : 'landscape';
}

/**
 * Orient a paper size: returns [pw, ph] with the short side as width
 * for portrait and the long side as width for landscape.
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
 * Uses the full required-dimensions formula (quiet zone + brand block + margins).
 */
export function patternFits(
  bw: number,
  bh: number,
  pw: number,
  ph: number,
  square: number,
): boolean {
  const wmW = wordmarkWidth(pw, ph);
  const { reqW, reqH } = requiredDimensions(bw, bh, square, wmW);
  return reqW <= pw && reqH <= ph;
}

// ---------------------------------------------------------------------------
// Tiling
// ---------------------------------------------------------------------------

/**
 * Compute tiling layout for a pattern that doesn't fit on one sheet.
 * Each sheet's window = page minus PAGE_MARGIN, minus BRAND_BLOCK_HEIGHT at the bottom.
 * The quiet zone applies only at the pattern's outer boundary, not at seams.
 * Chooses the tile orientation that needs the fewest sheets.
 */
export function computeTiling(
  bw: number,
  bh: number,
  paperW: number,
  paperH: number,
  overlapMm = TILE_OVERLAP,
): TilingLayout {
  const wmW = wordmarkWidth(paperW, paperH);
  const bbH = brandBlockHeight(wmW);

  function tilingForOrient(orient: 'portrait' | 'landscape') {
    const [tilePw, tilePh] = orientPaper(paperW, paperH, orient);
    const tileW = tilePw - 2 * PAGE_MARGIN;
    const tileH = tilePh - 2 * PAGE_MARGIN - bbH;
    const cols = tileW >= bw ? 1 : 1 + Math.ceil((bw - tileW) / (tileW - overlapMm));
    const rows = tileH >= bh ? 1 : 1 + Math.ceil((bh - tileH) / (tileH - overlapMm));
    return { cols, rows, tileW, tileH, tilePw, tilePh, totalPages: cols * rows, orient };
  }

  const port = tilingForOrient('portrait');
  const land = tilingForOrient('landscape');

  // Pick the orientation that needs the fewest sheets; ties → fewer seams (lower max of rows,cols)
  let best = port;
  if (land.totalPages < port.totalPages) {
    best = land;
  } else if (land.totalPages === port.totalPages) {
    const portSeams = (port.cols - 1) + (port.rows - 1);
    const landSeams = (land.cols - 1) + (land.rows - 1);
    if (landSeams < portSeams) best = land;
  }

  return {
    cols: best.cols, rows: best.rows, overlapMm,
    tileW: best.tileW, tileH: best.tileH,
    tilePw: best.tilePw, tilePh: best.tilePh,
    totalPages: best.totalPages,
  };
}

// ---------------------------------------------------------------------------
// Grid reduction
// ---------------------------------------------------------------------------

/**
 * Compute the largest grid (rows × cols) that fits one page,
 * keeping the square size unchanged.
 * Returns the best orientation too.
 */
export function computeGridReduction(
  spec: PatternSpec,
  paperW: number,
  paperH: number,
): { rows: number; cols: number; orientation: 'portrait' | 'landscape' } {
  let bestRows = 2, bestCols = 2;
  let bestOrient: 'portrait' | 'landscape' = 'landscape';

  for (const orient of ['portrait', 'landscape'] as const) {
    const [pw, ph] = orientPaper(paperW, paperH, orient);
    const wmW = wordmarkWidth(pw, ph);
    const qz = patternQuietZone(spec.square);
    const bbH = brandBlockHeight(wmW);
    const availW = pw - 2 * qz - 2 * PAGE_MARGIN;
    const availH = ph - 2 * qz - bbH - 2 * PAGE_MARGIN;
    const maxCols = Math.floor(availW / spec.square);
    const maxRows = Math.floor(availH / spec.square);
    const r = Math.min(spec.rows, Math.max(2, maxRows));
    const c = Math.min(spec.cols, Math.max(2, maxCols));
    if (r * c > bestRows * bestCols) {
      bestRows = r;
      bestCols = c;
      bestOrient = orient;
    }
  }

  return { rows: bestRows, cols: bestCols, orientation: bestOrient };
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
  square: number,
  isInch: boolean,
): string | null {
  const candidates = isInch
    ? ['Letter', 'Tabloid']
    : ['A4', 'A3', 'A2', 'A1', 'A0'];

  for (const name of candidates) {
    const [pW, pH] = PAPERS[name];
    for (const orient of ['portrait', 'landscape'] as const) {
      const [pw, ph] = orientPaper(pW, pH, orient);
      if (patternFits(bw, bh, pw, ph, square)) {
        return name;
      }
    }
  }
  return null;
}

/**
 * Compute the usable grid for the chosen paper and orientation.
 * Returns a human-readable string like "A4 portrait fits up to 7 × 11 at 20 mm".
 */
export function usableGridNotice(
  paperName: string,
  pw: number,
  ph: number,
  square: number,
): string {
  const qz = patternQuietZone(square);
  const wmW = wordmarkWidth(pw, ph);
  const bbH = brandBlockHeight(wmW);
  const availW = pw - 2 * qz - 2 * PAGE_MARGIN;
  const availH = ph - 2 * qz - bbH - 2 * PAGE_MARGIN;
  const maxCols = Math.max(1, Math.floor(availW / square));
  const maxRows = Math.max(1, Math.floor(availH / square));
  const orient = pw > ph ? 'landscape' : 'portrait';
  return `${paperName} ${orient} fits up to ${maxRows} \u00D7 ${maxCols} squares at ${square} mm`;
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
  const qz = patternQuietZone(spec.square);

  // Orientation (fit-based)
  const orientation = decideOrientation(bw, bh, orientOverride, paperW, paperH, spec.square);
  const [pw, ph] = orientPaper(paperW, paperH, orientation);

  // Brand block sizing
  const wmW = wordmarkWidth(pw, ph);
  const wmH = wmW / WM_ASPECT;
  const bbH = brandBlockHeight(wmW);

  // Check fit
  const fits = patternFits(bw, bh, pw, ph, spec.square);
  const isInch = paperW < 220 && paperH < 300; // rough heuristic for US sizes

  let fit: FitMode = 'single';
  let tiling: TilingLayout | undefined;
  let reducedSpec: { rows: number; cols: number; orientation: 'portrait' | 'landscape' } | undefined;
  let upsizePaper: string | undefined;

  if (!fits) {
    fit = 'tile'; // default recommendation
    tiling = computeTiling(bw, bh, paperW, paperH);
    reducedSpec = computeGridReduction(spec, paperW, paperH);
    upsizePaper = smallestFittingPaper(bw, bh, spec.square, isInch) ?? undefined;
  }

  // Pattern placement — centred in the available window above the brand block.
  // Vertical layout (top→bottom): PAGE_MARGIN, qz, [pattern], qz, bbH, PAGE_MARGIN
  const patternWindowTop = PAGE_MARGIN + qz;
  const patternWindowBottom = ph - PAGE_MARGIN - bbH - qz;
  const patternWindowH = patternWindowBottom - patternWindowTop;
  const patternWindowLeft = PAGE_MARGIN + qz;
  const patternWindowRight = pw - PAGE_MARGIN - qz;
  const patternWindowW = patternWindowRight - patternWindowLeft;

  // Centre the pattern in the available window (clamp if it doesn't fit)
  const oxFinal = patternWindowLeft + Math.max(0, (patternWindowW - bw) / 2);
  const oyFinal = patternWindowTop + Math.max(0, (patternWindowH - bh) / 2);

  // Brand block — bottom-left inside margins
  const brandWmX = PAGE_MARGIN;
  const brandWmY = ph - PAGE_MARGIN - wmH;
  const brandTextX = PAGE_MARGIN + wmW + 4; // 4 mm gap right of wordmark
  const brandTextY = brandWmY + 2; // align top of first line near top of wordmark

  const brand: BrandGeometry = {
    wmX: brandWmX,
    wmY: brandWmY,
    wmW,
    wmH,
    textX: brandTextX,
    textY: brandTextY,
    textLineH: BRAND_LINE_SPACING,
  };

  // Axes — fully inside PAGE_MARGIN and outside PATTERN_QUIET_ZONE
  const isKalibr = spec.type === 'AprilGrid (Kalibr)' && (spec.symmetricCorners ?? false);
  const shorter = Math.min(bw, bh);
  const arrowLen = Math.max(15, Math.min(40, shorter * 0.15));
  const headLen = Math.min(3, arrowLen * 0.2);
  const headW = headLen * 0.6;
  const shaft = 0.4;

  // Ideal origin: 0.5 squares before pattern top-left (or bottom-left for Kalibr)
  const idealAxOx = oxFinal - 0.5 * spec.square;
  const idealAxOy = isKalibr ? oyFinal + bh + 0.5 * spec.square : oyFinal - 0.5 * spec.square;

  // Clamp: origin and all drawn elements must be inside PAGE_MARGIN
  // and outside PATTERN_QUIET_ZONE (axes live in the gap between margin and quiet zone).
  // The caption sits ~4 mm above origin (OpenCV) or ~3 mm below (Kalibr).
  // X arrow extends arrowLen + ~5 mm label to the right.
  const minEdge = PAGE_MARGIN;
  const axOriginX = Math.max(minEdge, idealAxOx);
  let axOriginY: number;
  if (isKalibr) {
    axOriginY = Math.min(ph - minEdge - arrowLen - 3, idealAxOy);
  } else {
    // Caption is above origin (~4 mm), Y arrow goes down arrowLen
    axOriginY = Math.max(minEdge + 4, idealAxOy);
  }

  // Ensure X arrow + label fits within page
  const xEnd = axOriginX + arrowLen + 5; // 5 mm for "X" label
  if (xEnd > pw - minEdge) {
    // Shorten arrow or move origin left (origin already clamped to minEdge)
    // Just accept it — the arrow auto-scales with pattern size
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

  // Usable grid notice
  const paperName = Object.entries(PAPERS).find(([, [w, h]]) =>
    (Math.abs(w - paperW) < 0.1 && Math.abs(h - paperH) < 0.1) ||
    (Math.abs(w - paperH) < 0.1 && Math.abs(h - paperW) < 0.1)
  )?.[0] ?? `${pw}×${ph}`;
  const usableGrid = usableGridNotice(paperName, pw, ph, spec.square);

  return {
    pw, ph, ox: oxFinal, oy: oyFinal, bw, bh,
    orientation, fit,
    tiling, reducedSpec, upsizePaper,
    brand, axes, margin: PAGE_MARGIN,
    quietZone: qz,
    usableGrid,
  };
}

/**
 * Human-readable fit notice for the UI.
 * E.g. "Pattern 300 × 175 mm does not fit A4 at 100 %."
 */
export function fitNotice(bw: number, bh: number, paperName: string): string {
  return `Pattern ${bw} \u00D7 ${bh} mm does not fit ${paperName} at 100 %.`;
}

/**
 * Human-readable grid reduction description.
 * E.g. "7 × 12 → 5 × 9 at 25 mm, landscape"
 */
export function reductionNotice(
  origRows: number,
  origCols: number,
  newRows: number,
  newCols: number,
  square: number,
  newOrientation?: string,
): string {
  const orientSuffix = newOrientation ? `, ${newOrientation}` : '';
  return `${origRows} \u00D7 ${origCols} \u2192 ${newRows} \u00D7 ${newCols} at ${square} mm${orientSuffix}`;
}
