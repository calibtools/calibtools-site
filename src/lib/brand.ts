/**
 * Single source of truth for Calib.Tools brand constants and helpers.
 * Used by all export formats (PDF, SVG, PNG, DXF, config files, zip).
 */

import { idRange } from './idRange';

// ---------------------------------------------------------------------------
// Colour constants
// ---------------------------------------------------------------------------

export const BRAND_RED = '#E60012';
export const BRAND_INK = '#1A1A1A';

/** pdf-lib colour triplets (0–1 range) */
export const BRAND_RED_RGB = { r: 230 / 255, g: 0, b: 18 / 255 } as const;
export const BRAND_INK_RGB = { r: 26 / 255, g: 26 / 255, b: 26 / 255 } as const;

// ---------------------------------------------------------------------------
// Text / identity constants
// ---------------------------------------------------------------------------

export const BRAND_URL = 'calib.tools';
export const BRAND_NAME = 'Calib.Tools';
export const BRAND_EMAIL = 'hello@calib.tools';

// ---------------------------------------------------------------------------
// Logo grid — 3×3, row-major, matching Logo.astro:
//   i % 2 === 0 → bg-brand (BRAND_RED), else bg-ink (BRAND_INK)
// ---------------------------------------------------------------------------

export interface LogoCell {
  readonly col: number;
  readonly row: number;
  readonly fill: string;
}

export const LOGO_CELLS: readonly LogoCell[] = Array.from({ length: 9 }, (_, i) => ({
  col: i % 3,
  row: Math.floor(i / 3),
  fill: i % 2 === 0 ? BRAND_RED : BRAND_INK,
}));

// ---------------------------------------------------------------------------
// SVG logo mark
// ---------------------------------------------------------------------------

/**
 * Returns 9 SVG `<rect>` strings for the 3×3 logo mark.
 * @param opts.x     Left origin (SVG user units)
 * @param opts.y     Top origin (SVG user units)
 * @param opts.cellSize  Width/height of each cell
 * @param opts.gap   Gap between cells
 */
export function logoSvgPaths(opts: {
  x: number;
  y: number;
  cellSize: number;
  gap: number;
}): string[] {
  const { x, y, cellSize, gap } = opts;
  const step = cellSize + gap;
  return LOGO_CELLS.map(cell => {
    const cx = x + cell.col * step;
    const cy = y + cell.row * step;
    return `<rect x="${cx}" y="${cy}" width="${cellSize}" height="${cellSize}" fill="${cell.fill}"/>`;
  });
}

// ---------------------------------------------------------------------------
// Pattern summary
// ---------------------------------------------------------------------------

interface PatternSummaryOpts {
  type: string;
  rows: number;
  cols: number;
  square: number;
  marker?: number;
  dict?: string;
  startId?: number;
}

/**
 * Human-readable pattern summary.
 *
 * ChArUco (or any type with marker+dict):
 *   "ChArUco 7×10 · 25/18 mm · DICT_6X6_250 · id 0"
 *
 * Checkerboard (no marker/dict):
 *   "Checkerboard 7×10 · 25 mm"
 *
 * Note: uses × (U+00D7), not ASCII x.
 */
export function patternSummary(opts: PatternSummaryOpts): string {
  const { type, rows, cols, square, marker, dict, startId } = opts;
  const grid = `${rows}\u00D7${cols}`;
  const hasMarker = marker !== undefined && marker > 0;
  const hasDict = dict !== undefined && dict !== '';

  if (hasMarker && hasDict) {
    // Compute ID range for display
    const range = idRange({
      type: type as any, rows, cols, square, marker, dict,
      paper: '', startId: startId ?? 0, scaleBar: false,
    });
    const idStr = range ? `IDs ${range.min}\u2013${range.max}` : `id ${startId ?? 0}`;
    return `${type} ${grid} · ${square}/${marker} mm · ${dict} · ${idStr}`;
  }
  return `${type} ${grid} · ${square} mm`;
}

// ---------------------------------------------------------------------------
// Brand attribution line
// ---------------------------------------------------------------------------

/**
 * Full brand attribution line for file footers.
 *
 * Format:
 *   "{summary} · generated {YYYY-MM-DD} · calib.tools · Patterns and files © Calib.Tools, free to use; targets available at calib.tools/targets"
 */
export function brandLine(opts: { summary: string; date?: string }): string {
  const { summary, date } = opts;
  const iso = date ?? new Date().toISOString().slice(0, 10);
  return `${summary} · generated ${iso} · ${BRAND_URL} · Patterns and files © ${BRAND_NAME}, free to use; targets available at ${BRAND_URL}/targets`;
}
