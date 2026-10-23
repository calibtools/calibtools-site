/**
 * Renderer for circle-based patterns:
 * Symmetric circles, Asymmetric circles, HALCON-style dots.
 */
import type { PatternSpec } from './patterns';

/** Returns SVG elements for circle-based patterns. */
export function renderCirclesSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const asym = s.type === 'Asymmetric circles';
  const inv = s.invert ?? false;
  const spacingX = s.circleSpacingX ?? s.square;
  const spacingY = s.circleSpacingY ?? s.square;
  const diameter = s.circleDiameter ?? s.square * 0.56;
  const radius = diameter / 2;
  const bw = s.cols * spacingX;
  const bh = s.rows * spacingY;

  // Inverted: black background, white circles
  if (inv) {
    parts.push(`<rect x="${ox}" y="${oy}" width="${bw}" height="${bh}" fill="#000"/>`);
  }

  const fill = inv ? '#fff' : '#000';

  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      if (asym && (r + c) % 2 === 1) continue;
      const cx = ox + c * spacingX + spacingX / 2;
      const cy = oy + r * spacingY + spacingY / 2;
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}"/>`);
    }
  }
  return parts.join('');
}
