/**
 * PuzzleBoard renderer — positional-encoding calibration pattern.
 * Based on Stelldinger et al. (ICCV 2023).
 *
 * Each cell's color is determined by indexing a single maximal-length
 * LFSR sequence (M-sequence) with a stride-based 2D mapping:
 *   cell(gx, gy) = mseq[(gx + gy * STRIDE) mod period]
 *
 * The M-sequence's window property guarantees that any sufficiently large
 * sub-window of the grid uniquely identifies its (offsetX, offsetY) position
 * within the encoding space.
 *
 * Uses a 10-bit LFSR (period 1023) with primitive polynomial x^10 + x^9 + x^6 + x + 1,
 * and stride 37 (coprime to 1023).  Grids as small as 4x4 decode uniquely.
 */
import type { PatternSpec } from './patterns';

/**
 * Primitive polynomial taps for the Fibonacci LFSR: x^10 + x^9 + x^6 + x + 1.
 * Confirmed to produce a maximal-length sequence (period = 2^10 - 1 = 1023).
 */
const SEQ_BITS = 10;
const SEQ_TAPS = [10, 9, 6, 1];
const SEQ_PERIOD = (1 << SEQ_BITS) - 1; // 1023

/**
 * Row stride for the 2D → 1D index mapping.
 * Must be coprime to SEQ_PERIOD.  1023 = 3 × 11 × 31, and gcd(37, 1023) = 1.
 */
const STRIDE = 37;

/** Cached M-sequence (computed once on first use). */
let _seq: number[] | null = null;

/**
 * Generate the maximal-length LFSR sequence (Fibonacci form).
 * Period = 2^SEQ_BITS - 1 = 1023.
 * The window property ensures every 10-bit consecutive sub-string is unique.
 */
function getSequence(): number[] {
  if (_seq) return _seq;
  const period = SEQ_PERIOD;
  let state = 1; // non-zero initial state
  const seq: number[] = [];
  for (let i = 0; i < period; i++) {
    seq.push(state & 1);
    let fb = 0;
    for (const tap of SEQ_TAPS) fb ^= (state >> (tap - 1)) & 1;
    state = ((state >> 1) | (fb << (SEQ_BITS - 1))) & ((1 << SEQ_BITS) - 1);
  }
  _seq = seq;
  return seq;
}

/**
 * Compute the full grid of cell values for a PuzzleBoard.
 *
 * Cell at row r, col c gets value:
 *   mseq[((c + offsetX) + (r + offsetY) * STRIDE) mod 1023]
 *
 * Returns rows x cols array of 0 (white) or 1 (black).
 *
 * @param rows     Number of rows.
 * @param cols     Number of columns.
 * @param offsetX  Starting X position within the encoding space.
 * @param offsetY  Starting Y position within the encoding space.
 */
export function puzzleGrid(rows: number, cols: number, offsetX: number, offsetY: number): number[][] {
  const seq = getSequence();
  const p = SEQ_PERIOD;

  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      const idx = ((c + offsetX) + (r + offsetY) * STRIDE) % p;
      row.push(seq[idx]);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Decode the offset of a sub-window by brute-force search.
 *
 * Tries every candidate offset (ox, oy) in [0..maxSearchX] x [0..maxSearchY]
 * and returns the one whose generated grid matches the input.
 * Returns {x, y} if exactly one match found, null otherwise.
 *
 * For grids >= 4x4 with the 10-bit / stride-37 encoding, matches are
 * unique across the full search space (confirmed by test).
 */
export function decodePuzzleOffset(
  grid: number[][],
  maxSearchX: number,
  maxSearchY: number,
): { x: number; y: number } | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return null;

  const seq = getSequence();
  const p = SEQ_PERIOD;

  const matches: Array<{ x: number; y: number }> = [];

  for (let oy = 0; oy <= maxSearchY; oy++) {
    for (let ox = 0; ox <= maxSearchX; ox++) {
      let match = true;
      outer: for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = ((c + ox) + (r + oy) * STRIDE) % p;
          if (seq[idx] !== grid[r][c]) {
            match = false;
            break outer;
          }
        }
      }
      if (match) matches.push({ x: ox, y: oy });
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

/**
 * Render SVG elements for the PuzzleBoard pattern.
 * Produces a `<rect>` for each black (1) cell in the grid.
 * @param s  Pattern spec with rows, cols, square size, and puzzle offsets.
 * @param ox X offset on the page (mm).
 * @param oy Y offset on the page (mm).
 */
export function renderPuzzleBoardSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const offsetX = s.puzzleOffsetX ?? 0;
  const offsetY = s.puzzleOffsetY ?? 0;
  const grid = puzzleGrid(s.rows, s.cols, offsetX, offsetY);

  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      if (grid[r][c] === 1) {
        const x = ox + c * s.square;
        const y = oy + r * s.square;
        parts.push(`<rect x="${x}" y="${y}" width="${s.square}" height="${s.square}" fill="#000"/>`);
      }
    }
  }
  return parts.join('');
}
