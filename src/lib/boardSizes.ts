/**
 * Single source of truth for board sizes, grid geometry, and marker counts.
 *
 * Every file that needs square/marker sizes or grid dimensions must import
 * from here.  Values come from the ordering tables in the datasheets
 * (CT-DS-CHA-P, CT-DS-CHA-C, CT-DS-APR-P) and are checked by unit tests
 * that parse those tables directly.
 *
 * Integer-mm rounding causes the marker-to-square ratio to vary by size,
 * so each size carries its own marker dimension rather than one global ratio.
 */

export interface BoardSize {
  /** Board long × short in mm, e.g. "300 × 200". */
  label: string;
  /** Squares down (height direction). */
  rows: number;
  /** Squares across (width direction). */
  cols: number;
  /** Square side in mm. */
  square: number;
  /** Marker side in mm. */
  marker: number;
  /** Computed ratio marker/square. */
  ratio: number;
}

export interface AprilGridSize {
  /** Board long × short in mm, e.g. "300 × 200". */
  label: string;
  /** Tag rows (height direction). */
  rows: number;
  /** Tag columns (width direction). */
  cols: number;
  /** Tag side in mm. */
  tagSize: number;
  /** Gap between tags in mm. */
  gap: number;
}

/** Composite (CT-CHA-P / CT-CHT-P) board sizes. */
export const COMPOSITE_SIZES: BoardSize[] = [
  { label: '200 × 150', rows: 5,  cols: 7,  square: 25, marker: 18,   ratio: 18 / 25 },
  { label: '300 × 200', rows: 7,  cols: 10, square: 25, marker: 18,   ratio: 18 / 25 },
  { label: '400 × 300', rows: 9,  cols: 12, square: 30, marker: 22,   ratio: 22 / 30 },
  { label: '600 × 400', rows: 9,  cols: 14, square: 40, marker: 30,   ratio: 30 / 40 },
  { label: '800 × 600', rows: 11, cols: 15, square: 50, marker: 37,   ratio: 37 / 50 },
];

/** Ceramic (CT-CHA-C) board sizes. */
export const CERAMIC_SIZES: BoardSize[] = [
  { label: '110 × 85',  rows: 7, cols: 10, square: 10,   marker: 7.5,  ratio: 7.5 / 10 },
  { label: '150 × 100', rows: 7, cols: 11, square: 12.5, marker: 9.5,  ratio: 9.5 / 12.5 },
  { label: '185 × 110', rows: 7, cols: 12, square: 14,   marker: 10.5, ratio: 10.5 / 14 },
  { label: '230 × 140', rows: 8, cols: 14, square: 15,   marker: 11,   ratio: 11 / 15 },
];

/** All ChArUco sizes (composite + ceramic). */
export const ALL_CHARUCO_SIZES: BoardSize[] = [...COMPOSITE_SIZES, ...CERAMIC_SIZES];

/** AprilGrid composite (CT-APR-P) board sizes. */
export const APRILGRID_SIZES: AprilGridSize[] = [
  { label: '200 × 150', rows: 4, cols: 6,  tagSize: 25, gap: 7.5 },
  { label: '300 × 200', rows: 5, cols: 7,  tagSize: 30, gap: 9 },
  { label: '400 × 300', rows: 6, cols: 8,  tagSize: 35, gap: 10.5 },
  { label: '600 × 400', rows: 7, cols: 10, tagSize: 45, gap: 13.5 },
  { label: '800 × 600', rows: 9, cols: 12, tagSize: 50, gap: 15 },
];

/** Default marker-to-square ratio used by the wizard when computing from sensor distance. */
export const DEFAULT_MARKER_RATIO = 0.74;

/**
 * Marker/tag count for a given pattern type and grid dimensions.
 *
 * ChArUco: markers sit on white squares only → floor(rows × cols / 2).
 * AprilGrid: one tag per cell → rows × cols.
 */
export function markerCount(pattern: 'charuco' | 'aprilgrid', rows: number, cols: number): number {
  if (pattern === 'aprilgrid') return rows * cols;
  return Math.floor((rows * cols) / 2);
}

/**
 * Look up the marker size for a given square size.
 * Returns the closest match from ALL_CHARUCO_SIZES, or DEFAULT_MARKER_RATIO × square.
 */
export function markerForSquare(square: number): number {
  const match = ALL_CHARUCO_SIZES.find((s) => s.square === square);
  return match ? match.marker : Math.round(square * DEFAULT_MARKER_RATIO);
}

/**
 * Find a ChArUco board size by its label (e.g. "300 × 200").
 * Normalises whitespace and × vs x for matching.
 */
export function findCharucoSize(sizeLabel: string): BoardSize | undefined {
  const norm = (s: string) => s.replace(/\s+/g, '').replace(/×/g, 'x').toLowerCase();
  const needle = norm(sizeLabel);
  return ALL_CHARUCO_SIZES.find((s) => norm(s.label) === needle);
}

/**
 * Find an AprilGrid board size by its label (e.g. "300 × 200").
 */
export function findAprilGridSize(sizeLabel: string): AprilGridSize | undefined {
  const norm = (s: string) => s.replace(/\s+/g, '').replace(/×/g, 'x').toLowerCase();
  const needle = norm(sizeLabel);
  return APRILGRID_SIZES.find((s) => norm(s.label) === needle);
}
