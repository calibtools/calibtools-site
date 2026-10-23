/**
 * Renderer for circle-based patterns:
 * Symmetric circles, Asymmetric circles, HALCON-style dots.
 */
import type { PatternSpec } from './patterns';

/** Returns SVG elements for circle-based patterns. */
export function renderCirclesSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const asym = s.type === 'Asymmetric circles';
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      if (asym && (r + c) % 2 === 1) continue;
      const x = ox + c * s.square, y = oy + r * s.square;
      parts.push(`<circle cx="${x + s.square / 2}" cy="${y + s.square / 2}" r="${s.square * 0.28}" fill="#000"/>`);
    }
  }
  return parts.join('');
}
