/**
 * Shared stamp geometry — used by ctdoc.ts stamp_svg AND factory SVG.
 * Change here, both update.
 */

export const STAMP_DIAMETER = 32; // mm
export const STAMP_R_OUTER = STAMP_DIAMETER / 2; // 16 mm
export const STAMP_R_INNER = STAMP_R_OUTER - 1.8; // inner ring
export const STAMP_RING_OUTER_W = 0.4; // mm stroke
export const STAMP_RING_INNER_W = 0.25;
export const STAMP_TEXT_RADIUS = (STAMP_R_OUTER + STAMP_R_INNER) / 2; // ≈ 15.1 mm — middle of ring band
export const STAMP_TOP_TEXT = 'CALIB.TOOLS';
export const STAMP_BOTTOM_TEXT = 'DIMENSIONAL INSPECTION';
export const STAMP_ROTATION = -6; // degrees
export const STAMP_INK = '#333333'; // Grey 80
