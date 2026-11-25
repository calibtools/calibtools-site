/**
 * Renderer for Marker sheet — one or many markers arranged in a grid on a page.
 * Each marker has a black border + data bits from the selected dictionary/family.
 *
 * Layout: markers placed in rows × cols grid with 20% quiet zone between them.
 * Supports both ArUco dictionaries and AprilTag families; sheetSource() says which one a sheet uses.
 */
import type { PatternSpec } from './patterns';
import { getMarkerDict, decodeMarkerBits } from './dicts/dicts';
import { parseTagIdList } from './renderAprilGrid';

/**
 * Where a marker sheet takes its markers from, as OpenCV names it.
 *
 * With a tag family chosen the sheet holds AprilTags: OpenCV's DICT_APRILTAG_<family>, with the border the
 * form asks for (1 as in AprilTag 3 and OpenCV, or 2). Otherwise it is the ArUco dictionary, one-cell border.
 * The family wins over the dictionary field, which the form hides once a family is chosen.
 */
export function sheetSource(s: Pick<PatternSpec, 'dict' | 'aprilFamily' | 'borderBits'>): { name: string; borderBits: number } {
  return s.aprilFamily
    ? { name: `DICT_APRILTAG_${s.aprilFamily}`, borderBits: s.borderBits ?? 2 }
    : { name: s.dict, borderBits: 1 };
}

/** Side of one marker on a sheet, in mm. */
export function sheetMarkerSize(s: Pick<PatternSpec, 'marker' | 'square'>): number {
  return s.marker || s.square;
}

/** The marker IDs of a sheet, row by row from the top-left. */
export function sheetMarkerIds(s: Pick<PatternSpec, 'rows' | 'cols' | 'startId' | 'tagIdList'>): number[] {
  return parseTagIdList(s.tagIdList, s.startId, s.rows * s.cols);
}

/** Returns SVG elements for a marker sheet. */
export function renderMarkerSheetSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const markerSize = sheetMarkerSize(s);
  const quietZone = markerSize * 0.2; // 20% quiet zone between markers
  const step = markerSize + quietZone;
  const ids = sheetMarkerIds(s);
  const source = sheetSource(s);
  const dict = getMarkerDict(source.name);
  const border = source.borderBits;

  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const idx = r * s.cols + c;
      const markerId = ids[idx];
      const mx = ox + c * step;
      const my = oy + r * step;

      // Black background (marker + border)
      parts.push(`<rect x="${mx}" y="${my}" width="${markerSize}" height="${markerSize}" class="marker-bg" fill="#000"/>`);

      // Bits from the dictionary; a marker whose ID the dictionary does not have stays solid (the form stops it before a download).
      if (dict && markerId < dict.count) {
        const bits = decodeMarkerBits(dict.bits[markerId], dict.markerSize);
        const n = dict.markerSize;
        const cell = markerSize / (n + 2 * border);
        for (let bi = 0; bi < n; bi++) {
          for (let bj = 0; bj < n; bj++) {
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
