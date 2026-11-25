/**
 * Single source of truth for Calib.Tools brand constants and helpers.
 * Used by all export formats (PDF, SVG, PNG, DXF, config files, zip).
 */

import type { PatternSpec } from './patterns';
import { markerIds, idsAreOneRun, formatIds } from './idRange';
import { sheetSource, sheetMarkerSize } from './renderMarkerSheet';

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
/**
 * Short mission line (owner decision 2026-11-20): who the work is for. Sits above the full
 * mission paragraph on the About page and in the site footer.
 */
export const MISSION_LINE = 'Built for the people who make machines see.';

/** Shown beside the sign-in choices on /account/ (owner's pick, 2026-11-22). */
export const ACCOUNT_LINE = 'Pick up your calibration work where you left it.';
/**
 * Sign-off line (owner decision 2026-11-20): closes customer emails and order pages.
 * The Shopify notification templates carry the same sentence (docs/offers/README.md).
 */
export const SIGN_OFF_LINE = 'Every calibration starts with a target you can trust.';
export const ONE_LINER =
  'Calib.Tools builds the bridge between digital measurement and the physical world: calibration targets whose files, geometry and data agree.';

// ---------------------------------------------------------------------------
// Pattern summary
// ---------------------------------------------------------------------------

const mmText = (v: number) => String(Math.round(v * 1000) / 1000);

/**
 * One line that says what the pattern is. Printed under every pattern and written into every file, so it
 * takes the whole pattern: a copy with only some of the fields used to fall back to tag36h11 and a 0.3 gap
 * for an AprilGrid of another family (fixed 2026-11-25). Every value is read from where the renderers
 * read it; nothing here has a default of its own.
 *
 *   "ChArUco 7×10 · 25/18 mm · DICT_6X6_250 · IDs 0–34"
 *   "AprilGrid (Kalibr) 5×6 · 20 mm tags, 6 mm gap · tag16h5 · IDs 0–29"
 *   "Marker sheet 3×2 · 60 mm · DICT_APRILTAG_36h11 · IDs 0–5"
 *   "Symmetric circles 7×10 · 30 × 20 mm spacing"
 *   "Checkerboard 7×10 · 25 mm"
 *
 * Note: uses × (U+00D7), not ASCII x.
 */
export function patternSummary(s: PatternSpec): string {
  const grid = `${s.rows}\u00D7${s.cols}`;
  const ids = markerIds(s);
  const idText = ids && ids.length > 0 ? ` \u00B7 IDs ${idsAreOneRun(ids) ? `${ids[0]}\u2013${ids[ids.length - 1]}` : formatIds(ids)}` : '';
  switch (s.type) {
    case 'AprilGrid (Kalibr)': {
      // Tags, not squares and ArUco markers: tag side, gap and AprilTag family; IDs run over every cell.
      const gap = mmText(s.square * (s.tagSpacing ?? 0.3));
      const border = (s.borderBits ?? 2) === 1 ? ' \u00B7 1-bit border' : '';
      return `${s.type} ${grid} \u00B7 ${mmText(s.square)} mm tags, ${gap} mm gap \u00B7 tag${s.aprilFamily ?? '36h11'}${border}${idText}`;
    }
    case 'Marker sheet': {
      // A marker sheet has no squares: its one size is the marker.
      const source = sheetSource(s);
      const border = source.borderBits === 2 ? ' \u00B7 2-bit border' : '';
      return `${s.type} ${grid} · ${mmText(sheetMarkerSize(s))} mm · ${source.name}${border}${idText}`;
    }
    case 'ChArUco': {
      const legacy = s.legacyLayout && s.rows % 2 === 0 ? ' · legacy layout' : '';
      return `${s.type} ${grid} · ${s.square}/${s.marker} mm · ${s.dict}${idText}${legacy}`;
    }
    case 'ArUco grid':
      return `${s.type} ${grid} · ${s.square}/${s.marker} mm · ${s.dict}${idText}`;
    case 'Symmetric circles':
    case 'Asymmetric circles':
    case 'HALCON-style dots': {
      const sx = s.circleSpacingX ?? s.square, sy = s.circleSpacingY ?? s.square;
      return `${s.type} ${grid} · ${sx === sy ? mmText(sx) : `${mmText(sx)} \u00D7 ${mmText(sy)}`} mm spacing`;
    }
    default:
      return `${s.type} ${grid} · ${s.square} mm`;
  }
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
