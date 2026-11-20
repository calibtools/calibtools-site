/**
 * Input limits for the pattern generator form. Not geometry: `patterns.ts` draws whatever it is given,
 * so the form hands it only values a board can have. A field that is empty, negative or absurdly large
 * while someone is typing falls back to the nearest value that works, and the form says so.
 */
import type { PatternSpec } from './patterns';

/** Most rows or columns the preview and the PDF are asked to draw. */
export const GRID_MAX = 100;
const SIZE_MIN = 0.01;
const SIZE_MAX = 10_000;
const ID_MAX = 100_000;

const int = (v: number, lo: number, hi: number, fallback: number) =>
  Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback;
const size = (v: number, fallback: number) =>
  Number.isFinite(v) && v > 0 ? Math.min(SIZE_MAX, Math.max(SIZE_MIN, v)) : fallback;

/** The same spec with every number inside what a board can have. Returns `s` itself when nothing changed. */
export function safeSpec(s: PatternSpec, fallback: PatternSpec): PatternSpec {
  const gridMin = s.type === 'Marker sheet' ? 1 : 2;
  const next: PatternSpec = {
    ...s,
    rows: int(s.rows, gridMin, GRID_MAX, fallback.rows),
    cols: int(s.cols, gridMin, GRID_MAX, fallback.cols),
    square: size(s.square, fallback.square),
    marker: size(s.marker, fallback.marker),
    startId: int(s.startId, 0, ID_MAX, 0),
  };
  if (s.tagSpacing !== undefined) next.tagSpacing = Number.isFinite(s.tagSpacing) ? Math.min(1, Math.max(0.05, s.tagSpacing)) : 0.3;
  for (const k of ['circleDiameter', 'circleSpacingX', 'circleSpacingY'] as const) {
    const v = s[k];
    if (v !== undefined) next[k] = size(v, next.square);
  }
  const changed = (Object.keys(next) as (keyof PatternSpec)[]).some((k) => next[k] !== s[k]);
  return changed ? next : s;
}

/** One sentence for the form when a typed value was replaced, or null. */
export function limitNote(raw: PatternSpec, safe: PatternSpec): string | null {
  if (raw === safe) return null;
  const gridMin = raw.type === 'Marker sheet' ? 1 : 2;
  if (raw.rows !== safe.rows || raw.cols !== safe.cols) return `Rows and columns go from ${gridMin} to ${GRID_MAX}. The preview uses ${safe.rows} × ${safe.cols}.`;
  if (raw.startId !== safe.startId) return `The start ID is a whole number from 0. The preview uses ${safe.startId}.`;
  return 'Sizes and spacings must be greater than zero. The preview uses the nearest value that works.';
}
