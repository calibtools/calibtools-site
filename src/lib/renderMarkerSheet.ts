/**
 * Renderer for Marker sheet — one or many markers arranged in a grid on a page.
 * Each marker has a black border + data bits from the selected dictionary/family.
 *
 * Layout: markers placed in rows × cols grid with 20% quiet zone between them.
 * Supports both ArUco dictionaries and AprilTag families.
 */
import type { PatternSpec } from './patterns';
import { getArUcoDict, decodeMarkerBits, getAprilFamily, decodeAprilBits } from './dicts/dicts';
import { parseTagIdList } from './renderAprilGrid';

/** Returns SVG elements for a marker sheet. */
export function renderMarkerSheetSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const markerSize = s.marker || s.square;
  const quietZone = markerSize * 0.2; // 20% quiet zone between markers
  const step = markerSize + quietZone;
  const numMarkers = s.rows * s.cols;
  const ids = parseTagIdList(s.tagIdList, s.startId, numMarkers);

  const dict = getArUcoDict(s.dict);
  const family = s.aprilFamily ? getAprilFamily(s.aprilFamily) : undefined;

  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const idx = r * s.cols + c;
      const markerId = ids[idx];
      const mx = ox + c * step;
      const my = oy + r * step;

      // Black background (marker + border)
      parts.push(`<rect x="${mx}" y="${my}" width="${markerSize}" height="${markerSize}" class="marker-bg" fill="#000"/>`);

      // Render bits from ArUco dictionary
      if (dict && markerId < dict.count) {
        const bits = decodeMarkerBits(dict.bits[markerId], dict.markerSize);
        const n = dict.markerSize;
        const border = 1;
        const totalCells = n + 2 * border;
        const cell = markerSize / totalCells;
        for (let bi = 0; bi < n; bi++) {
          for (let bj = 0; bj < n; bj++) {
            if (bits[bi][bj] === 1) {
              parts.push(`<rect x="${mx + (bj + border) * cell}" y="${my + (bi + border) * cell}" width="${cell}" height="${cell}" fill="#fff"/>`);
            }
          }
        }
      }
      // Render bits from AprilTag family
      else if (family && markerId < family.count) {
        const d = family.d;
        const border = s.borderBits ?? 2;
        const totalCells = d + 2 * border;
        const cell = markerSize / totalCells;
        const bits = decodeAprilBits(family.codes[markerId], d);
        for (let bi = 0; bi < d; bi++) {
          for (let bj = 0; bj < d; bj++) {
            if (bits[bi][bj] === 1) {
              parts.push(`<rect x="${mx + (bj + border) * cell}" y="${my + (bi + border) * cell}" width="${cell}" height="${cell}" fill="#fff"/>`);
            }
          }
        }
      }

      // ID label below marker
      if (s.showTagIds) {
        const labelY = my + markerSize + quietZone * 0.6;
        const labelX = mx + markerSize / 2;
        const fontSize = Math.min(quietZone * 0.5, 3);
        if (fontSize >= 0.8) {
          parts.push(`<text x="${labelX}" y="${labelY}" class="marker-id" font-family="'Geist Mono', monospace" font-size="${fontSize.toFixed(1)}" text-anchor="middle" fill="#333">${markerId}</text>`);
        }
      }
    }
  }
  return parts.join('');
}
