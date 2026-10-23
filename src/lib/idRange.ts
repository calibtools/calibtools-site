/**
 * Compute the marker/tag ID range for a pattern spec.
 * Returns null for patterns without markers (Checkerboard, circles).
 *
 * ChArUco / ArUco grid: floor(rows × cols / 2) markers (white squares only).
 * AprilGrid (Kalibr) / Marker sheet: rows × cols markers.
 *
 * Matches cv::aruco::CharucoBoard and Kalibr AprilGrid ID assignment.
 */
import type { PatternSpec } from './patterns';

export interface IdRangeResult {
  min: number;
  max: number;
  count: number;
}

export function idRange(spec: PatternSpec): IdRangeResult | null {
  const { type, rows, cols, startId } = spec;

  if (type === 'ChArUco' || type === 'ArUco grid') {
    const count = Math.floor((rows * cols) / 2);
    return { min: startId, max: startId + count - 1, count };
  }

  if (type === 'AprilGrid (Kalibr)') {
    const count = rows * cols;
    return { min: startId, max: startId + count - 1, count };
  }

  if ((type as string) === 'Marker sheet') {
    const count = rows * cols;
    return { min: startId, max: startId + count - 1, count };
  }

  return null;
}
