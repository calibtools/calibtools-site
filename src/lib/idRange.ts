/**
 * The marker or tag IDs a pattern carries, read from the same lists the renderers draw from.
 * Null for patterns without markers (checkerboard, circles, PuzzleBoard).
 *
 * ChArUco: one marker per white square, cv::aruco::CharucoBoard order.
 * ArUco grid (GridBoard): one per cell. AprilGrid (Kalibr) and marker sheets: one per cell, from the
 * start ID or from the ID list typed into the form.
 */
import type { PatternSpec } from './patterns';
import { charucoMarkers, gridBoardMarkers } from './renderCharuco';
import { aprilGridTags } from './renderAprilGrid';
import { sheetMarkerIds, sheetSource } from './renderMarkerSheet';
import { getMarkerDict, getAprilFamily } from './dicts/dicts';

export interface IdRangeResult {
  min: number;
  max: number;
  count: number;
}

/** Every ID on the pattern, in the order the pattern numbers its markers. */
export function markerIds(spec: PatternSpec): number[] | null {
  switch (spec.type) {
    case 'ChArUco': return charucoMarkers(spec).map((m) => m.id);
    case 'ArUco grid': return gridBoardMarkers(spec).map((m) => m.id);
    case 'AprilGrid (Kalibr)': return aprilGridTags(spec).map((t) => t.id);
    case 'Marker sheet': return sheetMarkerIds(spec);
    default: return null;
  }
}

/** Lowest ID, highest ID and how many there are. */
export function idRange(spec: PatternSpec): IdRangeResult | null {
  const ids = markerIds(spec);
  if (!ids || ids.length === 0) return null;
  return { min: Math.min(...ids), max: Math.max(...ids), count: ids.length };
}

/** True when the IDs are one unbroken ascending run, which is what "IDs 0–34" says. */
export function idsAreOneRun(ids: number[]): boolean {
  return ids.every((id, i) => i === 0 || id === ids[i - 1] + 1);
}

/**
 * IDs in words: "0–34" for one run, "10–15, 100, 200–204" for a list.
 * A long list is cut after `maxParts` runs and says how many IDs there are in all.
 */
export function formatIds(ids: number[], maxParts = 6): string {
  const parts: string[] = [];
  for (let i = 0; i < ids.length;) {
    let j = i;
    while (j + 1 < ids.length && ids[j + 1] === ids[j] + 1) j++;
    parts.push(j > i ? `${ids[i]}\u2013${ids[j]}` : String(ids[i]));
    i = j + 1;
  }
  return parts.length <= maxParts ? parts.join(', ') : `${parts.slice(0, maxParts).join(', ')}, \u2026 (${ids.length} IDs)`;
}

/**
 * The dictionary or tag family a pattern draws its markers from, under the name a detector knows it by:
 * an OpenCV dictionary (ChArUco, ArUco grid, marker sheet) or an AprilTag family (AprilGrid).
 * `count` is how many markers it holds; null when the pattern has no markers or the data is not on hand.
 */
export function markerSource(s: PatternSpec): { name: string; count: number } | null {
  if (s.type === 'AprilGrid (Kalibr)') {
    const family = getAprilFamily(s.aprilFamily ?? '36h11');
    return family ? { name: `tag${s.aprilFamily ?? '36h11'}`, count: family.count } : null;
  }
  if (s.type !== 'ChArUco' && s.type !== 'ArUco grid' && s.type !== 'Marker sheet') return null;
  const name = s.type === 'Marker sheet' ? sheetSource(s).name : s.dict;
  const dict = getMarkerDict(name);
  return dict ? { name, count: dict.count } : null;
}

/** The marker IDs a pattern uses against what its dictionary or tag family holds. */
export interface MarkerCapacity { firstId: number; lastId: number; count: number; short: boolean }

/**
 * Whether the dictionary or tag family holds every ID on the pattern. tag16h5 has 30 tags, tag25h9 has 35,
 * DICT_4X4_50 has 50: a marker whose ID is beyond that cannot be drawn and the renderers leave it solid black,
 * so the form turns the downloads off while `short` is true.
 * Null for patterns without markers, and when the dictionary is not on hand.
 */
export function markerCapacity(s: PatternSpec): MarkerCapacity | null {
  const source = markerSource(s);
  const range = idRange(s);
  if (!source || !range) return null;
  return { firstId: range.min, lastId: range.max, count: source.count, short: range.max >= source.count };
}
