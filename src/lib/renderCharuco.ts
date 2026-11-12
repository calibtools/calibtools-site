/**
 * Renderers for ChArUco boards and ArUco grids (GridBoard) —
 * black squares + real ArUco marker bits from dictionary JSON in white squares.
 *
 * Marker IDs follow cv.aruco.CharucoBoard: row-major over white squares,
 * offset by PatternSpec.startId.
 */
import type { PatternSpec } from './patterns';
import { getArUcoDict, decodeMarkerBits } from './dicts/dicts';

/** One marker on the board: ID, cell, and top-left corner in mm from the board's top-left corner. */
export interface BoardMarker { id: number; row: number; col: number; x: number; y: number; size: number }

/**
 * Which cells carry a marker. OpenCV >= 4.6 puts a black square top-left and markers on the cells where
 * row + column is odd. The layout of OpenCV <= 4.5 (CharucoBoard::setLegacyPattern(true)) differs only when the
 * number of rows is even: there the top-left cell is white and carries the first marker
 * (aruco_board.cpp: `legacyPattern && size.height % 2 == 0` skips cells where (y + 1) % 2 == x % 2).
 */
export function isMarkerCell(s: Pick<PatternSpec, 'rows' | 'legacyLayout'>, r: number, c: number): boolean {
  const legacyShift = s.legacyLayout === true && s.rows % 2 === 0;
  return ((r + c) % 2 !== 0) !== legacyShift;
}

function markerAt(s: PatternSpec, r: number, c: number): BoardMarker {
  const inset = (s.square - s.marker) / 2;
  return {
    id: s.startId + markerIndex(s, r, c),
    row: r, col: c,
    x: c * s.square + inset, y: r * s.square + inset, size: s.marker,
  };
}

/** Every marker of a ChArUco board, in ID order. The renderer draws from the same positions. */
export function charucoMarkers(s: PatternSpec): BoardMarker[] {
  const out: BoardMarker[] = [];
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) if (isMarkerCell(s, r, c)) out.push(markerAt(s, r, c));
  return out;
}

/** One ArUco marker: black square with the one-cell border, white cells from the dictionary bits. Solid black when the ID is not in the dictionary. */
function markerSvg(dict: ReturnType<typeof getArUcoDict>, markerId: number, mx: number, my: number, m: number): string {
  let out = `<rect x="${mx}" y="${my}" width="${m}" height="${m}" fill="#000"/>`;
  if (dict && markerId < dict.count) {
    const bits = decodeMarkerBits(dict.bits[markerId], dict.markerSize);
    const n = dict.markerSize;
    const border = 1; // 1-cell black border
    const cell = m / (n + 2 * border);
    for (let bi = 0; bi < n; bi++) {
      for (let bj = 0; bj < n; bj++) {
        if (bits[bi][bj] === 1) out += `<rect x="${mx + (bj + border) * cell}" y="${my + (bi + border) * cell}" width="${cell}" height="${cell}" fill="#fff"/>`;
      }
    }
  }
  return out;
}

/**
 * Every marker of an ArUco grid, in ID order. This is cv.aruco.GridBoard((cols, rows), marker, separation, dict):
 * one marker per cell, IDs row by row from the top-left, markers `separation` apart with white between them.
 * `square` is the pitch from one marker to the next, so separation = square - marker.
 * Positions are from the top-left corner of the first marker.
 */
export function gridBoardMarkers(s: PatternSpec): BoardMarker[] {
  const out: BoardMarker[] = [];
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) out.push({ id: s.startId + r * s.cols + c, row: r, col: c, x: c * s.square, y: r * s.square, size: s.marker });
  }
  return out;
}

/** Gap between neighboring markers of an ArUco grid (GridBoard's markerSeparation). */
export function gridBoardSeparation(s: Pick<PatternSpec, 'square' | 'marker'>): number {
  return s.square - s.marker;
}

/** Returns SVG elements for an ArUco grid (GridBoard): markers only, no squares. */
export function renderArucoGridSvg(s: PatternSpec, ox: number, oy: number): string {
  const dict = getArUcoDict(s.dict);
  return gridBoardMarkers(s).map((m) => markerSvg(dict, m.id, ox + m.x, oy + m.y, m.size)).join('');
}

/** Returns SVG elements for a ChArUco pattern. */
export function renderCharucoSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const dict = getArUcoDict(s.dict);

  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const x = ox + c * s.square, y = oy + r * s.square;
      const black = !isMarkerCell(s, r, c);
      if (black) {
        parts.push(`<rect x="${x}" y="${y}" width="${s.square}" height="${s.square}" fill="#000"/>`);
      } else {
        // Marker in white square
        const { id: markerId, x: relX, y: relY, size: m } = markerAt(s, r, c);
        const mx = ox + relX;
        const my = oy + relY;

        parts.push(markerSvg(dict, markerId, mx, my, m));
      }
    }
  }
  return parts.join('');
}

/** Marker index of a marker cell: markers are numbered row by row, left to right, in both layouts. */
function markerIndex(s: PatternSpec, r: number, c: number): number {
  let idx = 0;
  for (let rr = 0; rr < s.rows; rr++) {
    for (let cc = 0; cc < s.cols; cc++) {
      if (rr === r && cc === c) return idx;
      if (isMarkerCell(s, rr, cc)) idx++;
    }
  }
  return idx;
}
