/**
 * Renderer for ChArUco and ArUco grid patterns —
 * black squares + real ArUco marker bits from dictionary JSON in white squares.
 *
 * Marker IDs follow cv.aruco.CharucoBoard: row-major over white squares,
 * offset by PatternSpec.startId.
 */
import type { PatternSpec } from './patterns';
import { getArUcoDict, decodeMarkerBits } from './dicts/dicts';

/** One marker on the board: ID, cell, and top-left corner in mm from the board's top-left corner. */
export interface BoardMarker { id: number; row: number; col: number; x: number; y: number; size: number }

function markerAt(s: PatternSpec, r: number, c: number): BoardMarker {
  const inset = (s.square - s.marker) / 2;
  return {
    id: s.startId + markerIndex(r, c, s.rows, s.cols, s.legacyLayout),
    row: r, col: c,
    x: c * s.square + inset, y: r * s.square + inset, size: s.marker,
  };
}

/** Every marker of a ChArUco or ArUco grid board, in ID order. The renderer draws from the same positions. */
export function charucoMarkers(s: PatternSpec): BoardMarker[] {
  const out: BoardMarker[] = [];
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) if ((r + c) % 2 !== 0) out.push(markerAt(s, r, c));
  return out;
}

/** Returns SVG elements for a ChArUco or ArUco grid pattern. */
export function renderCharucoSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const dict = getArUcoDict(s.dict);

  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const x = ox + c * s.square, y = oy + r * s.square;
      const black = (r + c) % 2 === 0;
      if (black) {
        parts.push(`<rect x="${x}" y="${y}" width="${s.square}" height="${s.square}" fill="#000"/>`);
      } else {
        // Marker in white square
        const { id: markerId, x: relX, y: relY, size: m } = markerAt(s, r, c);
        const mx = ox + relX;
        const my = oy + relY;

        if (dict && markerId < dict.count) {
          // Real dictionary bits
          const bits = decodeMarkerBits(dict.bits[markerId], dict.markerSize);
          const n = dict.markerSize;
          const border = 1; // 1-cell black border
          const totalCells = n + 2 * border;
          const cell = m / totalCells;

          // Black background (includes border)
          parts.push(`<rect x="${mx}" y="${my}" width="${m}" height="${m}" fill="#000"/>`);
          // White cells from bit grid (1 = white)
          for (let bi = 0; bi < n; bi++) {
            for (let bj = 0; bj < n; bj++) {
              if (bits[bi][bj] === 1) {
                parts.push(`<rect x="${mx + (bj + border) * cell}" y="${my + (bi + border) * cell}" width="${cell}" height="${cell}" fill="#fff"/>`);
              }
            }
          }
        } else {
          // Fallback: solid black marker background (no dict or id out of range)
          parts.push(`<rect x="${mx}" y="${my}" width="${m}" height="${m}" fill="#000"/>`);
        }
      }
    }
  }
  return parts.join('');
}

/**
 * Compute the ArUco marker index for a white-square position in a ChArUco board.
 *
 * OpenCV >= 4.6 (default): row-major over white squares.
 *   Count white squares left-to-right, top-to-bottom.
 *
 * Legacy (OpenCV <= 4.5): the old layout counted differently.
 *   For simplicity, legacy uses the same row-major ordering (the toggle exists
 *   in the UI; marker reordering can be refined later).
 */
function markerIndex(r: number, c: number, rows: number, cols: number, _legacy?: boolean): number {
  // Count how many white squares ((r+c)%2 !== 0) come before position (r,c)
  let idx = 0;
  for (let rr = 0; rr < rows; rr++) {
    for (let cc = 0; cc < cols; cc++) {
      if (rr === r && cc === c) return idx;
      if ((rr + cc) % 2 !== 0) idx++;
    }
  }
  return idx;
}
