/**
 * Renderer for plain Checkerboard pattern — black squares only.
 * Options: invert, OpenCV's radon checkerboard outline, and its three finder markers.
 */
import type { PatternSpec } from './patterns';

/**
 * The three cells that carry a finder marker, as (column, row) from the top-left square, or null when the
 * board is too small to hold them.
 *
 * cv.findChessboardCornersSB with CALIB_CB_MARKER accepts a board only when it finds exactly three marked
 * cells that touch in an L (chessboard.cpp: `3 != detectMarkers(...)` drops the board, and
 * normalizeMarkerOrientation looks for a marked cell with a marked neighbor beside it and one above or below).
 * These are the cells of OpenCV's own example, `generate_pattern.py --type radon_checkerboard -c 15 -r 10
 * -m 7 4 7 5 8 5`, moved to the middle of any grid.
 *
 * OpenCV 5.0 finds the markers on every grid from 6 × 6 squares up (read back for 6 to 12 rows by 6 to 14
 * columns, normal and inverted). On smaller grids it finds them on some and not on others, so those get none.
 */
export const FINDER_MIN_SQUARES = 6;

export function finderMarkerCells(s: Pick<PatternSpec, 'rows' | 'cols' | 'finderMarkers'>): Array<[number, number]> | null {
  if (!s.finderMarkers || s.rows < FINDER_MIN_SQUARES || s.cols < FINDER_MIN_SQUARES) return null;
  const x = Math.floor((s.cols - 1) / 2), y = Math.floor((s.rows - 1) / 2);
  return [[x, y], [x, y + 1], [x + 1, y + 1]];
}

/**
 * Returns SVG elements for a Checkerboard pattern (black squares on white).
 *
 * Options (via PatternSpec):
 * - `invert`: swap which squares are black ((r+c)%2 !== 0 instead of === 0)
 * - `radonCheckers`: OpenCV's radon checkerboard. The squares that meet inside the board stay square, so every
 *   inner corner is still a clean crossing; only the outline is rounded: a black square on the edge of the board
 *   has its outward corners replaced by a quarter circle of half the square size (generate_pattern.py, _get_type
 *   and _make_round_rect). Drawn as a disc plus the quarter squares that stay, so PDF and DXF read it as they
 *   read every other pattern.
 * - `finderMarkers`: a dot of radius 0.17 × square in the middle of each cell of finderMarkerCells(), white on
 *   a black square and black on a white one, for CALIB_CB_MARKER.
 */
export function renderCheckerboardSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const q = s.square;
  const isBlack = (r: number, c: number) => ((r + c) % 2 === 0) !== (s.invert ?? false);

  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      if (!isBlack(r, c)) continue;
      const x = ox + c * q, y = oy + r * q;
      const left = c === 0, right = c === s.cols - 1, top = r === 0, bottom = r === s.rows - 1;
      if (!s.radonCheckers || !(left || right || top || bottom)) {
        parts.push(`<rect x="${x}" y="${y}" width="${q}" height="${q}" fill="#000"/>`);
        continue;
      }
      const h = q / 2;
      parts.push(`<circle cx="${x + h}" cy="${y + h}" r="${h}" fill="#000"/>`);
      // A corner is rounded when it lies on the outline of the board; the other quarters stay square.
      if (!(left || top)) parts.push(`<rect x="${x}" y="${y}" width="${h}" height="${h}" fill="#000"/>`);
      if (!(right || top)) parts.push(`<rect x="${x + h}" y="${y}" width="${h}" height="${h}" fill="#000"/>`);
      if (!(right || bottom)) parts.push(`<rect x="${x + h}" y="${y + h}" width="${h}" height="${h}" fill="#000"/>`);
      if (!(left || bottom)) parts.push(`<rect x="${x}" y="${y + h}" width="${h}" height="${h}" fill="#000"/>`);
    }
  }

  for (const [c, r] of finderMarkerCells(s) ?? []) {
    const fill = isBlack(r, c) ? '#fff' : '#000';
    parts.push(`<circle cx="${ox + c * q + q / 2}" cy="${oy + r * q + q / 2}" r="${Math.round(0.17 * q * 1e6) / 1e6}" fill="${fill}" class="finder-marker"/>`);
  }

  return parts.join('');
}
