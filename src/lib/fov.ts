/**
 * FOV (field of view) calculator.
 * All linear dimensions in mm. Angles in degrees.
 *
 * Core formula (rectilinear lens):
 *   FOV = 2 × atan(sensorDim / (2 × focalLength))
 *
 * Matches: https://www.edmundoptics.com/knowledge-center/application-notes/imaging/
 *          understanding-focal-length-and-field-of-view/
 */

import { COMPOSITE_SIZES, CERAMIC_SIZES, type BoardSize } from './boardSizes';

/** Convert radians to degrees. */
const rad2deg = (r: number) => (r * 180) / Math.PI;


export interface FovResult {
  /** Horizontal FOV in degrees. */
  hFovDeg: number;
  /** Vertical FOV in degrees. */
  vFovDeg: number;
  /** Diagonal FOV in degrees. */
  dFovDeg: number;
  /** Horizontal coverage at working distance (mm). */
  hCoverage: number;
  /** Vertical coverage at working distance (mm). */
  vCoverage: number;
  /** Ground sample distance — mm per pixel at working distance. */
  gsd: number;
}

/**
 * Calculate FOV and coverage for a rectilinear lens.
 *
 * @param sensorW  Sensor width in mm
 * @param sensorH  Sensor height in mm
 * @param focal    Focal length in mm
 * @param distance Working distance in mm
 * @param resW     Image width in pixels
 * @param resH     Image height in pixels
 *
 * Formula: FOV = 2 * atan(sensor / (2 * focal))
 * Coverage = 2 * distance * tan(FOV / 2)
 * GSD = coverage / resolution
 */
export function calculateFov(
  sensorW: number,
  sensorH: number,
  focal: number,
  distance: number,
  resW: number,
  resH: number,
): FovResult {
  const diag = Math.sqrt(sensorW * sensorW + sensorH * sensorH);

  const hFovRad = 2 * Math.atan(sensorW / (2 * focal));
  const vFovRad = 2 * Math.atan(sensorH / (2 * focal));
  const dFovRad = 2 * Math.atan(diag / (2 * focal));

  const hCoverage = 2 * distance * Math.tan(hFovRad / 2);
  const vCoverage = 2 * distance * Math.tan(vFovRad / 2);

  const gsd = Math.max(hCoverage / resW, vCoverage / resH);

  return {
    hFovDeg: rad2deg(hFovRad),
    vFovDeg: rad2deg(vFovRad),
    dFovDeg: rad2deg(dFovRad),
    hCoverage,
    vCoverage,
    gsd,
  };
}

/**
 * Common sensor presets: name → [width_mm, height_mm, resW, resH].
 * Values from manufacturer specs.
 */
export const SENSOR_PRESETS: Record<string, [number, number, number, number]> = {
  '1/4" (OV7251)':     [3.60, 2.70, 640, 480],
  '1/3" (AR0330)':     [4.80, 3.60, 2304, 1536],
  '1/2.5" (IMX264)':   [5.70, 4.28, 2448, 2048],
  '1/2" (IMX290)':     [6.46, 3.63, 1920, 1080],
  '1/1.8" (IMX178)':   [7.41, 4.94, 3072, 2048],
  '2/3" (IMX174)':     [8.77, 6.60, 1920, 1200],
  '1" (IMX253)':       [13.13, 8.76, 4096, 3000],
  'APS-C (Canon)':     [22.30, 14.90, 6000, 4000],
  'Full frame (35mm)': [36.00, 24.00, 6000, 4000],
  'Custom': [0, 0, 0, 0],
};

/**
 * Compute the minimum working distance for a target to fill a given
 * fraction of the sensor.
 *
 * @param targetW  Target width in mm
 * @param targetH  Target height in mm
 * @param sensorW  Sensor width in mm
 * @param sensorH  Sensor height in mm
 * @param focal    Focal length in mm
 * @param fill     Fill fraction (0..1), e.g. 0.8 = target fills 80% of frame
 *
 * Formula: distance = (targetDim * focal) / (sensorDim * fill)
 * We take the max of horizontal and vertical to ensure the target fits.
 */
export function minDistance(
  targetW: number,
  targetH: number,
  sensorW: number,
  sensorH: number,
  focal: number,
  fill = 0.8,
): number {
  const dH = (targetW * focal) / (sensorW * fill);
  const dV = (targetH * focal) / (sensorH * fill);
  return Math.max(dH, dV);
}

/**
 * Focal length needed so the field of view covers at least
 * `coverageW × coverageH` mm at `distance` mm (pinhole model).
 *
 * Formula: f = sensorDim × distance / coverageDim, taking the shorter of the
 * horizontal and vertical results so both dimensions are covered.
 */
export function requiredFocal(
  sensorW: number,
  sensorH: number,
  distance: number,
  coverageW: number,
  coverageH: number,
): number {
  const fH = (sensorW * distance) / coverageW;
  const fV = coverageH > 0 ? (sensorH * distance) / coverageH : Infinity;
  return Math.min(fH, fV);
}


export interface BoardRecommendation {
  board: BoardSize;
  /** Product page path for this board family. */
  productPath: string;
  /** Physical board width/height in mm (landscape). */
  boardW: number;
  boardH: number;
  /** Fraction of the frame the board covers (max of h and v). */
  fill: number;
  /** Pixels across one checker square at the working distance. */
  pxPerSquare: number;
  /** Pixels across one marker bit cell (DICT 6×6: 8 cells incl. border). */
  pxPerBit: number;
  /** True when markers are large enough to decode reliably (≥ 3 px per bit). */
  decodable: boolean;
}

/** Target fill used for the board recommendation (fraction of the frame). */
export const TARGET_FILL = 0.6;

function parseLabel(label: string): [number, number] {
  const [a, b] = label.split('×').map((s) => parseFloat(s));
  return [Math.max(a, b), Math.min(a, b)];
}

/**
 * Recommend a ChArUco board for a given coverage and GSD.
 *
 * Picks the board whose frame fill is closest to TARGET_FILL without
 * exceeding 0.9, preferring composite boards and using ceramic boards only
 * when no composite board fits. If every board is too large, returns the
 * smallest.
 * Boards come from boardSizes.ts (composite + ceramic).
 */
export function recommendBoard(
  hCoverage: number,
  vCoverage: number,
  gsd: number,
  markerBits = 6,
): BoardRecommendation {
  const all = [
    ...CERAMIC_SIZES.map((b) => ({ b, productPath: '/targets/charuco-ceramic/' })),
    ...COMPOSITE_SIZES.map((b) => ({ b, productPath: '/targets/charuco-composite/' })),
  ];
  const covLong = Math.max(hCoverage, vCoverage);
  const covShort = Math.min(hCoverage, vCoverage);
  const scored = all.map(({ b, productPath }) => {
    const [bw, bh] = parseLabel(b.label);
    const fill = Math.max(bw / covLong, bh / covShort);
    return { b, productPath, bw, bh, fill };
  });
  // Prefer composite boards; fall back to ceramic only when no composite fits.
  const fitComposite = scored.filter((s) => s.fill <= 0.9 && s.productPath.endsWith('composite/'));
  const fitting = fitComposite.length ? fitComposite : scored.filter((s) => s.fill <= 0.9);
  const pick = fitting.length
    ? fitting.reduce((best, s) => (Math.abs(s.fill - TARGET_FILL) < Math.abs(best.fill - TARGET_FILL) ? s : best))
    : scored.reduce((best, s) => (s.fill < best.fill ? s : best));
  const pxPerSquare = pick.b.square / gsd;
  const pxPerBit = pick.b.marker / (markerBits + 2) / gsd;
  return {
    board: pick.b,
    productPath: pick.productPath,
    boardW: pick.bw,
    boardH: pick.bh,
    fill: pick.fill,
    pxPerSquare,
    pxPerBit,
    decodable: pxPerBit >= 3,
  };
}
