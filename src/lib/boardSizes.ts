/**
 * Single source of truth for board sizes, square and marker dimensions.
 *
 * Every file that needs square/marker sizes must import from here.
 * Integer-mm rounding causes the marker-to-square ratio to vary by size,
 * so each size carries its own marker dimension rather than one global ratio.
 */

export interface BoardSize {
  /** Board long × short in mm, e.g. "300 × 200". */
  label: string;
  /** Square side in mm. */
  square: number;
  /** Marker side in mm. */
  marker: number;
  /** Computed ratio marker/square. */
  ratio: number;
}

/** Composite (CT-CHA-P / CT-CHT-P) board sizes. */
export const COMPOSITE_SIZES: BoardSize[] = [
  { label: '200 × 150', square: 25, marker: 18, ratio: 18 / 25 },
  { label: '300 × 200', square: 25, marker: 18, ratio: 18 / 25 },
  { label: '400 × 300', square: 30, marker: 22, ratio: 22 / 30 },
  { label: '600 × 400', square: 40, marker: 30, ratio: 30 / 40 },
  { label: '800 × 600', square: 50, marker: 37, ratio: 37 / 50 },
];

/** Ceramic (CT-CHA-C) board sizes. */
export const CERAMIC_SIZES: BoardSize[] = [
  { label: '110 × 85',  square: 10,   marker: 7.5,  ratio: 7.5 / 10 },
  { label: '150 × 100', square: 12.5, marker: 9.5,  ratio: 9.5 / 12.5 },
  { label: '185 × 110', square: 14,   marker: 10.5, ratio: 10.5 / 14 },
  { label: '230 × 140', square: 15,   marker: 11,   ratio: 11 / 15 },
];

/** All ChArUco sizes (composite + ceramic). */
export const ALL_CHARUCO_SIZES: BoardSize[] = [...COMPOSITE_SIZES, ...CERAMIC_SIZES];

/** Default marker-to-square ratio used by the wizard when computing from sensor distance. */
export const DEFAULT_MARKER_RATIO = 0.74;

/**
 * Look up the marker size for a given square size.
 * Returns the closest match from ALL_CHARUCO_SIZES, or DEFAULT_MARKER_RATIO × square.
 */
export function markerForSquare(square: number): number {
  const match = ALL_CHARUCO_SIZES.find((s) => s.square === square);
  return match ? match.marker : Math.round(square * DEFAULT_MARKER_RATIO);
}
