/**
 * Single source of truth for Calib.Tools brand constants and helpers.
 * Used by all export formats (PDF, SVG, PNG, DXF, config files, zip).
 */

import { idRange } from './idRange';

// ---------------------------------------------------------------------------
// Color constants
// ---------------------------------------------------------------------------

export const BRAND_RED = '#E60012';
export const BRAND_INK = '#1A1A1A';

/** pdf-lib color triplets (0–1 range) */
export const BRAND_RED_RGB = { r: 230 / 255, g: 0, b: 18 / 255 } as const;
export const BRAND_INK_RGB = { r: 26 / 255, g: 26 / 255, b: 26 / 255 } as const;

// ---------------------------------------------------------------------------
// Text / identity constants
// ---------------------------------------------------------------------------

export const BRAND_URL = 'calib.tools';
export const BRAND_NAME = 'Calib.Tools';
export const BRAND_EMAIL = 'hello@calib.tools';

// ---------------------------------------------------------------------------
// Vision, mission, one-liner (verbatim; the only place these sentences live).
// TAGLINE lives in ./claims.ts.
// ---------------------------------------------------------------------------

export const VISION =
  'A world where every machine that sees knows exactly what its pixels mean in the physical world.';
export const MISSION =
  'We make the physical references that turn pixels into millimeters — targets, files and measurement data — and we publish exactly how each file maps to each object, so any engineer can check it. The tools stay free.';
export const ONE_LINER =
  'Calib.Tools builds the bridge between digital measurement and the physical world: calibration targets whose files, geometry and data agree.';

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
  aprilFamily?: string;
  tagSpacing?: number;
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
  if (type === 'AprilGrid (Kalibr)') {
    // Tags, not squares and ArUco markers: tag side, gap and AprilTag family; IDs run over every cell.
    const first = startId ?? 0;
    const gap = Math.round(square * (opts.tagSpacing ?? 0.3) * 1000) / 1000;
    return `${type} ${grid} \u00B7 ${square} mm tags, ${gap} mm gap \u00B7 tag${opts.aprilFamily ?? '36h11'} \u00B7 IDs ${first}\u2013${first + rows * cols - 1}`;
  }
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
