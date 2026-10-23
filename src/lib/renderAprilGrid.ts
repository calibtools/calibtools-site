/**
 * Renderer for AprilGrid (Kalibr) patterns —
 * currently identical to ChArUco rendering.
 */
import type { PatternSpec } from './patterns';

/** Returns SVG elements for an AprilGrid pattern. */
export function renderAprilGridSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const x = ox + c * s.square, y = oy + r * s.square;
      const black = (r + c) % 2 === 0;
      if (black) {
        parts.push(`<rect x="${x}" y="${y}" width="${s.square}" height="${s.square}" fill="#000"/>`);
      } else {
        // TODO: real marker bitmaps from dictionary data files; placeholder 6x6 pseudo-random bits.
        const m = s.marker, mx = x + (s.square - m) / 2, my = y + (s.square - m) / 2, n = 8, cell = m / n;
        const id = s.startId + Math.floor((r * s.cols + c) / 2);
        parts.push(`<rect x="${mx}" y="${my}" width="${m}" height="${m}" fill="#000"/>`);
        for (let i = 1; i < n - 1; i++) for (let j = 1; j < n - 1; j++) {
          const bit = ((id * 31 + i * 7 + j * 13) % 5) < 2;
          if (!bit) parts.push(`<rect x="${mx + j * cell}" y="${my + i * cell}" width="${cell}" height="${cell}" fill="#fff"/>`);
        }
      }
    }
  }
  return parts.join('');
}
