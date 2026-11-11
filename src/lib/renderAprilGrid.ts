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

/**
 * One tag on the grid: ID, cell, and top-left corner in mm from the top-left corner of the tag block.
 * row and col are Kalibr's: row 0 is the bottom row, col 0 the left column.
 */
export interface GridTag { id: number; row: number; col: number; x: number; y: number; size: number }

/**
 * Every tag of an AprilGrid in ID order. The renderer draws from the same positions.
 *
 * Layout is Kalibr's (aslam_cameras_april, createTargetPDF.py and GridCalibrationTargetAprilgrid.cpp):
 * the first ID is the bottom-left tag, IDs run left to right and then upward. Kalibr looks every
 * tag up by its ID and assumes this arrangement, so a grid numbered from the top is a mirror image
 * of the one Kalibr expects and cannot be calibrated with it.
 */
export function aprilGridTags(s: PatternSpec): GridTag[] {
  const step = s.square + s.square * (s.tagSpacing ?? 0.3);
  const ids = parseTagIdList(s.tagIdList, s.startId, s.rows * s.cols);
  const out: GridTag[] = [];
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      out.push({ id: ids[r * s.cols + c], row: r, col: c, x: c * step, y: (s.rows - 1 - r) * step, size: s.square });
    }
  }
  return out;
}

/**
 * True when the pattern's coordinate frame is Kalibr's: origin at the bottom-left tag corner, x right, y up.
 * Every AprilGrid is laid out that way, with or without the corner squares.
 */
export function isKalibrFrame(s: Pick<PatternSpec, 'type'>): boolean {
  return s.type === 'AprilGrid (Kalibr)';
}

/** How far the pattern's ink stands outside its extent on every side: the corner squares of an AprilGrid, one gap wide. */
export function inkOverhang(s: Pick<PatternSpec, 'type' | 'square' | 'tagSpacing' | 'symmetricCorners'>): number {
  return s.type === 'AprilGrid (Kalibr)' && s.symmetricCorners ? s.square * (s.tagSpacing ?? 0.3) : 0;
}

/** Top of the 100 mm scale bar, below the pattern and clear of any corner squares. */
export function scaleBarTop(s: Pick<PatternSpec, 'type' | 'square' | 'tagSpacing' | 'symmetricCorners'>, oy: number, bh: number): number {
  return oy + bh + 8 + inkOverhang(s);
}

/**
 * Where the axes origin sits relative to the pattern: `x` to the left of it, `y` above it (OpenCV frame)
 * or below it (Kalibr frame). Below the pattern the origin also has to clear the scale bar and its label.
 */
export function axesOffset(s: Pick<PatternSpec, 'type' | 'square' | 'tagSpacing' | 'symmetricCorners' | 'scaleBar'>): { x: number; y: number } {
  const over = inkOverhang(s);
  const side = Math.max(0.5 * s.square, over + 2);
  if (!isKalibrFrame(s)) return { x: side, y: side };
  return { x: side, y: Math.max(side, s.scaleBar ? over + 18 : 0) };
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
  const tags = aprilGridTags(s);

  for (const tag of tags) {
    const tagId = tag.id;
    const tx = ox + tag.x;
    const ty = oy + tag.y;

    // Tag background (black, includes border)
    parts.push(`<rect x="${tx}" y="${ty}" width="${tagSize}" height="${tagSize}" class="tag-bg" fill="#000"/>`);

    if (family && tagId < family.count) {
      const d = family.d;
      const totalCells = d + 2 * borderBits;
      const cell = tagSize / totalCells;

      // Decode tag bits and draw white cells. Kalibr prints every tag turned by 180 degrees
      // (rotation=2 in createTargetPDF.py) and reads the corner order from that orientation.
      const bits = decodeAprilBits(family.codes[tagId], d, family.bit_x, family.bit_y);
      for (let bi = 0; bi < d; bi++) {
        for (let bj = 0; bj < d; bj++) {
          if (bits[bi][bj] === 1) {
            const cx = tx + (d - 1 - bj + borderBits) * cell;
            const cy = ty + (d - 1 - bi + borderBits) * cell;
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

  // Symmetric corner squares, as Kalibr draws them: a gap-sized black square at each of the four
  // corners of every tag, touching the tag corner. Between tags the squares of neighbors coincide;
  // around the block they stand one gap outside the tags.
  if (s.symmetricCorners) {
    for (let r = 0; r <= s.rows; r++) {
      for (let c = 0; c <= s.cols; c++) {
        const cx = ox + c * step - gap;
        const cy = oy + r * step - gap;
        parts.push(`<rect x="${cx}" y="${cy}" width="${gap}" height="${gap}" fill="#000" class="corner-square"/>`);
      }
    }
  }

  return parts.join('');
}
