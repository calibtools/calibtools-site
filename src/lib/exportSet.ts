import type { PatternSpec } from './patterns';
import { idRange, type IdRangeResult } from './idRange';
import { BRAND_NAME, SITE_URL } from './exportBrand';
import { opencvJson } from './exportConfig';

export interface SetBoard {
  index: number;
  startId: number;
  idRange: IdRangeResult;
  spec: PatternSpec;
}

/**
 * Compute board specs for a multi-board set.
 * By default, board k starts at k * markersPerBoard.
 */
export function computeSetBoards(
  baseSpec: PatternSpec,
  count: number,
  overrideStartIds?: number[],
): SetBoard[] {
  const range = idRange({ ...baseSpec, tagIdList: undefined });
  if (!range) return [];

  const markersPerBoard = range.count;
  const boards: SetBoard[] = [];

  for (let k = 0; k < count; k++) {
    const startId = overrideStartIds?.[k] ?? (baseSpec.startId + k * markersPerBoard);
    // A set numbers its boards one after the other, so a typed ID list does not carry over to the boards.
    const spec = { ...baseSpec, startId, tagIdList: undefined };
    const boardRange = idRange(spec)!;
    boards.push({ index: k, startId, idRange: boardRange, spec });
  }

  return boards;
}

/** What every board of the set shares, as opencv.json states it: no IDs, no file header. */
function boardFields(spec: PatternSpec): Record<string, unknown> {
  const { _generator, start_id, ids, id_range, axes, ...shared } = JSON.parse(opencvJson(spec));
  return shared;
}

/** Build set-manifest.json string. */
export function buildSetManifest(baseSpec: PatternSpec, boards: SetBoard[]): string {
  return JSON.stringify({
    _generator: { name: BRAND_NAME, url: `https://${SITE_URL}`, generated: new Date().toISOString().slice(0, 10) },
    ...boardFields(baseSpec),
    board_count: boards.length,
    boards: boards.map(b => ({
      index: b.index,
      file: setBoardFilename(baseSpec, b.startId),
      start_id: b.startId,
      id_range: [b.idRange.min, b.idRange.max],
    })),
  }, null, 2);
}

/** Filename for a board PDF in a set. */
export function setBoardFilename(baseSpec: PatternSpec, startId: number): string {
  const slug = `${baseSpec.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${baseSpec.rows}x${baseSpec.cols}-${baseSpec.square}mm`;
  return `${slug}-id${startId}.pdf`;
}

/** Two boards of a set whose ID ranges overlap, with the IDs they share. */
export interface SetOverlap { a: number; b: number; first: number; last: number }

/**
 * Boards that share marker IDs. A changed start ID can make two ranges overlap, and OpenCV 4.8 and later
 * return no ChArUco corners at all for an image in which one ID appears twice; the set export stays off.
 */
export function setOverlaps(boards: SetBoard[]): SetOverlap[] {
  const out: SetOverlap[] = [];
  for (let i = 0; i < boards.length; i++) {
    for (let j = i + 1; j < boards.length; j++) {
      const first = Math.max(boards[i].idRange.min, boards[j].idRange.min);
      const last = Math.min(boards[i].idRange.max, boards[j].idRange.max);
      if (first <= last) out.push({ a: boards[i].index, b: boards[j].index, first, last });
    }
  }
  return out;
}
