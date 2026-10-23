/**
 * Renderer for plain Checkerboard pattern — black squares only.
 */
import type { PatternSpec } from './patterns';

/** Returns SVG elements for a Checkerboard pattern (black squares on white). */
export function renderCheckerboardSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const x = ox + c * s.square, y = oy + r * s.square;
      const black = (r + c) % 2 === 0;
      if (black) {
        parts.push(`<rect x="${x}" y="${y}" width="${s.square}" height="${s.square}" fill="#000"/>`);
      }
    }
  }
  return parts.join('');
}
