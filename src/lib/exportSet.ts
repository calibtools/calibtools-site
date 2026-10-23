import type { PatternSpec } from './patterns';
import { idRange, type IdRangeResult } from './idRange';
import { BRAND_NAME, BRAND_URL } from './brand';

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
  const range = idRange(baseSpec);
  if (!range) return [];

  const markersPerBoard = range.count;
  const boards: SetBoard[] = [];

  for (let k = 0; k < count; k++) {
    const startId = overrideStartIds?.[k] ?? k * markersPerBoard;
    const spec = { ...baseSpec, startId };
    const boardRange = idRange(spec)!;
    boards.push({ index: k, startId, idRange: boardRange, spec });
  }

  return boards;
}

/** Build set-manifest.json string. */
export function buildSetManifest(baseSpec: PatternSpec, boards: SetBoard[]): string {
  return JSON.stringify({
    _generator: { name: BRAND_NAME, url: `https://${BRAND_URL}`, generated: new Date().toISOString().slice(0, 10) },
    pattern: baseSpec.type,
    rows: baseSpec.rows,
    cols: baseSpec.cols,
    square_mm: baseSpec.square,
    marker_mm: baseSpec.marker,
    dictionary: baseSpec.dict,
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
