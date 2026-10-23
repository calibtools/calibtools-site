/**
 * Renderer for plain Checkerboard pattern — black squares only.
 * Supports finder markers (CALIB_CB_MARKER), Radon rounded corners, and invert.
 */
import type { PatternSpec } from './patterns';

/**
 * Returns SVG elements for a Checkerboard pattern (black squares on white).
 *
 * Options (via PatternSpec):
 * - `invert`: swap which squares are black ((r+c)%2 !== 0 instead of === 0)
 * - `radonCheckers`: add rx/ry corner radius (0.15 × square) for Radon/Deltille style
 * - `finderMarkers`: draw 3 grey circles at top-left, bottom-left, top-right corners
 *   (OpenCV CALIB_CB_MARKER flag for findChessboardCornersSB)
 */
export function renderCheckerboardSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const radius = s.radonCheckers ? (0.15 * s.square) : 0;
  const rxAttr = radius > 0 ? ` rx="${radius}" ry="${radius}"` : '';

  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const x = ox + c * s.square, y = oy + r * s.square;
      const even = (r + c) % 2 === 0;
      const black = s.invert ? !even : even;
      if (black) {
        parts.push(`<rect x="${x}" y="${y}" width="${s.square}" height="${s.square}"${rxAttr} fill="#000"/>`);
      }
    }
  }

  // Finder markers: 3 circles at CALIB_CB_MARKER positions
  if (s.finderMarkers) {
    const cr = 0.25 * s.square;
    const positions = [
      { r: 0, c: 0 },                    // top-left
      { r: s.rows - 1, c: 0 },           // bottom-left
      { r: 0, c: s.cols - 1 },           // top-right
    ];
    for (const p of positions) {
      const cx = ox + p.c * s.square + s.square / 2;
      const cy = oy + p.r * s.square + s.square / 2;
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${cr}" fill="#888" class="finder-marker"/>`);
    }
  }

  return parts.join('');
}
