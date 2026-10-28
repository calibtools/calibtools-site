/**
 * Renderer for AprilGrid (Kalibr) patterns.
 * Tags arranged in a grid with configurable spacing, border bits, and families.
 */
import type { PatternSpec } from './patterns';
import { getAprilFamily, decodeAprilBits } from './dicts/dicts';

/**
 * Parse a tag ID list string like "0-9,15,20-24" into an array of IDs.
 * Falls back to sequential IDs from startId if input is undefined or a plain number.
 */
export function parseTagIdList(input: string | undefined, startId: number, count: number): number[] {
  if (!input || /^\d+$/.test(input)) {
    const start = input ? parseInt(input, 10) : startId;
    return Array.from({ length: count }, (_, i) => start + i);
  }
  const ids: number[] = [];
  for (const part of input.split(',')) {
    const range = part.trim().match(/^(\d+)-(\d+)$/);
    if (range) {
      const lo = parseInt(range[1], 10);
      const hi = parseInt(range[2], 10);
      for (let i = lo; i <= hi; i++) ids.push(i);
    } else if (/^\d+$/.test(part.trim())) {
      ids.push(parseInt(part.trim(), 10));
    }
  }
  // Pad with sequential if not enough IDs
  while (ids.length < count) {
    ids.push((ids.length > 0 ? ids[ids.length - 1] : startId) + 1);
  }
  return ids.slice(0, count);
}

/** Returns SVG elements for an AprilGrid pattern. */
export function renderAprilGridSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const familyName = s.aprilFamily ?? '36h11';
  const family = getAprilFamily(familyName);
  const borderBits = s.borderBits ?? 2;
  const tagSpacingRatio = s.tagSpacing ?? 0.3;
  const tagSize = s.square; // tag outer size in mm (including border)
  const gap = tagSize * tagSpacingRatio;
  const step = tagSize + gap;
  const numTags = s.rows * s.cols;
  const tagIds = parseTagIdList(s.tagIdList, s.startId, numTags);

  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const idx = r * s.cols + c;
      const tagId = tagIds[idx];
      const tx = ox + c * step;
      const ty = oy + r * step;

      // Tag background (black, includes border)
      parts.push(`<rect x="${tx}" y="${ty}" width="${tagSize}" height="${tagSize}" class="tag-bg" fill="#000"/>`);

      if (family && tagId < family.count) {
        const d = family.d;
        const totalCells = d + 2 * borderBits;
        const cell = tagSize / totalCells;

        // Decode tag bits and draw white cells
        const bits = decodeAprilBits(family.codes[tagId], d, family.bit_x, family.bit_y);
        for (let bi = 0; bi < d; bi++) {
          for (let bj = 0; bj < d; bj++) {
            if (bits[bi][bj] === 1) {
              const cx = tx + (bj + borderBits) * cell;
              const cy = ty + (bi + borderBits) * cell;
              parts.push(`<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" fill="#fff"/>`);
            }
          }
        }
      }

      // Tag ID label (below tag, outside quiet zone)
      if (s.showTagIds) {
        const labelY = ty + tagSize + gap * 0.6;
        const labelX = tx + tagSize / 2;
        const fontSize = Math.min(gap * 0.5, 3);
        if (fontSize >= 0.8) { // don't draw unreadably small labels
          parts.push(`<text x="${labelX}" y="${labelY}" class="tag-id" font-family="'Geist Mono', monospace" font-size="${fontSize.toFixed(1)}" text-anchor="middle" fill="#333">${tagId}</text>`);
        }
      }
    }
  }

  // Symmetric corner squares (small filled squares at grid intersection points)
  if (s.symmetricCorners) {
    const cornerSize = tagSize * 0.15;
    for (let r = 0; r <= s.rows; r++) {
      for (let c = 0; c <= s.cols; c++) {
        const cx = ox + c * step - gap / 2 - cornerSize / 2;
        const cy = oy + r * step - gap / 2 - cornerSize / 2;
        parts.push(`<rect x="${cx}" y="${cy}" width="${cornerSize}" height="${cornerSize}" fill="#000" class="corner-square"/>`);
      }
    }
  }

  return parts.join('');
}
