/**
 * Pattern detection using OpenCV.js.
 * Wraps cv.findChessboardCorners / cv.aruco.detectMarkers.
 * Browser-only (needs OpenCV.js WASM loaded via ./opencv.ts).
 */
import type { PatternSpec } from './patterns';

export interface DetectionResult {
  /** Whether the expected pattern was fully detected. */
  found: boolean;
  /** Number of corners/markers detected. */
  detectedCount: number;
  /** Number of corners/markers expected. */
  expectedCount: number;
  /** Detected corner positions as [x, y] pixel coordinates. */
  corners: Array<[number, number]>;
  /** Detection time in ms. */
  timeMs: number;
  /** Human-readable status message. */
  message: string;
}

/**
 * Expected corner/marker count for a given pattern spec.
 * Matches cv.findChessboardCorners (inner corners) and cv.aruco.detectMarkers.
 */
export function expectedCount(spec: PatternSpec): number {
  if (spec.type === 'Checkerboard') {
    return (spec.rows - 1) * (spec.cols - 1);
  }
  if (spec.type === 'ChArUco') {
    // ChArUco: inner corners same as checkerboard
    return (spec.rows - 1) * (spec.cols - 1);
  }
  if (spec.type === 'ArUco grid' || spec.type === 'AprilGrid (Kalibr)') {
    // Number of markers (white squares contain markers)
    return Math.floor((spec.rows * spec.cols) / 2);
  }
  if (spec.type === 'Marker sheet') {
    return spec.rows * spec.cols;
  }
  if (spec.type === 'Symmetric circles' || spec.type === 'HALCON-style dots') {
    return spec.rows * spec.cols;
  }
  if (spec.type === 'Asymmetric circles') {
    return spec.rows * spec.cols;
  }
  return (spec.rows - 1) * (spec.cols - 1);
}

/**
 * Detect a calibration pattern in an image using OpenCV.js.
 *
 * @param cv     The loaded OpenCV.js module
 * @param image  HTMLImageElement or HTMLCanvasElement with the image
 * @param spec   Pattern specification to detect
 */
export function detectPattern(
  cv: any,
  image: HTMLImageElement | HTMLCanvasElement,
  spec: PatternSpec,
): DetectionResult {
  const t0 = performance.now();
  const expected = expectedCount(spec);

  // Load image into OpenCV Mat
  const canvas = document.createElement('canvas');
  canvas.width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  canvas.height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  let corners: Array<[number, number]> = [];
  let found = false;
  let detectedCount = 0;

  try {
    if (spec.type === 'Checkerboard') {
      const result = detectCheckerboard(cv, gray, spec);
      corners = result.corners;
      found = result.found;
      detectedCount = corners.length;
    } else if (spec.type === 'ChArUco') {
      const result = detectCharuco(cv, gray, spec);
      corners = result.corners;
      found = result.found;
      detectedCount = corners.length;
    } else if (spec.type === 'Symmetric circles' || spec.type === 'HALCON-style dots') {
      const result = detectCircles(cv, gray, spec, false);
      corners = result.corners;
      found = result.found;
      detectedCount = corners.length;
    } else if (spec.type === 'Asymmetric circles') {
      const result = detectCircles(cv, gray, spec, true);
      corners = result.corners;
      found = result.found;
      detectedCount = corners.length;
    } else {
      // ArUco grid / AprilGrid — use aruco detector
      const result = detectAruco(cv, gray, spec);
      corners = result.corners;
      found = result.found;
      detectedCount = corners.length;
    }
  } finally {
    src.delete();
    gray.delete();
  }

  const timeMs = performance.now() - t0;
  const message = found
    ? `Detected ${detectedCount}/${expected} ${spec.type === 'Checkerboard' || spec.type === 'ChArUco' ? 'corners' : 'markers'} in ${timeMs.toFixed(0)} ms`
    : `Detection failed: found ${detectedCount}/${expected}. Check image quality, lighting, and pattern parameters.`;

  return { found, detectedCount, expectedCount: expected, corners, timeMs, message };
}

function detectCheckerboard(cv: any, gray: any, spec: PatternSpec) {
  const innerRows = spec.rows - 1;
  const innerCols = spec.cols - 1;
  const patternSize = new cv.Size(innerCols, innerRows);
  const cornersMat = new cv.Mat();
  const flags = cv.CALIB_CB_ADAPTIVE_THRESH + cv.CALIB_CB_NORMALIZE_IMAGE + cv.CALIB_CB_FAST_CHECK;

  const found = cv.findChessboardCorners(gray, patternSize, cornersMat, flags);

  const corners: Array<[number, number]> = [];
  if (found) {
    // Refine to sub-pixel
    const criteria = new cv.TermCriteria(cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER, 30, 0.001);
    const winSize = new cv.Size(11, 11);
    const zeroZone = new cv.Size(-1, -1);
    cv.cornerSubPix(gray, cornersMat, winSize, zeroZone, criteria);

    for (let i = 0; i < cornersMat.rows; i++) {
      corners.push([cornersMat.floatAt(i, 0), cornersMat.floatAt(i, 1)]);
    }
  }

  cornersMat.delete();
  return { found, corners };
}

function detectCharuco(cv: any, gray: any, spec: PatternSpec) {
  // Try ArUco detection first, then interpolate ChArUco corners
  try {
    const dict = getDictionary(cv, spec.dict);
    const board = new cv.aruco_CharucoBoard(
      new cv.Size(spec.cols, spec.rows),
      spec.square,
      spec.marker,
      dict,
    );
    const detectorParams = new cv.aruco_DetectorParameters();
    const markerCorners = new cv.MatVector();
    const markerIds = new cv.Mat();

    cv.aruco_detectMarkers(gray, dict, markerCorners, markerIds, detectorParams);

    const corners: Array<[number, number]> = [];
    let found = false;

    if (markerIds.rows > 0) {
      const charucoCorners = new cv.Mat();
      const charucoIds = new cv.Mat();

      cv.aruco_interpolateCornersCharuco(
        markerCorners, markerIds, gray, board, charucoCorners, charucoIds,
      );

      if (charucoCorners.rows > 0) {
        for (let i = 0; i < charucoCorners.rows; i++) {
          corners.push([charucoCorners.floatAt(i, 0), charucoCorners.floatAt(i, 1)]);
        }
        found = corners.length === (spec.rows - 1) * (spec.cols - 1);
      }

      charucoCorners.delete();
      charucoIds.delete();
    }

    markerCorners.delete();
    markerIds.delete();
    detectorParams.delete();

    return { found, corners };
  } catch {
    // Fallback to checkerboard detection if ArUco API not available
    return detectCheckerboard(cv, gray, spec);
  }
}

function detectCircles(cv: any, gray: any, spec: PatternSpec, asymmetric: boolean) {
  const patternSize = new cv.Size(spec.cols, spec.rows);
  const centersMat = new cv.Mat();
  const flags = asymmetric
    ? cv.CALIB_CB_ASYMMETRIC_GRID + cv.CALIB_CB_CLUSTERING
    : cv.CALIB_CB_SYMMETRIC_GRID + cv.CALIB_CB_CLUSTERING;

  const found = cv.findCirclesGrid(gray, patternSize, centersMat, flags);

  const corners: Array<[number, number]> = [];
  if (found) {
    for (let i = 0; i < centersMat.rows; i++) {
      corners.push([centersMat.floatAt(i, 0), centersMat.floatAt(i, 1)]);
    }
  }

  centersMat.delete();
  return { found, corners };
}

function detectAruco(cv: any, gray: any, spec: PatternSpec) {
  try {
    const dict = getDictionary(cv, spec.dict);
    const detectorParams = new cv.aruco_DetectorParameters();
    const markerCorners = new cv.MatVector();
    const markerIds = new cv.Mat();

    cv.aruco_detectMarkers(gray, dict, markerCorners, markerIds, detectorParams);

    const corners: Array<[number, number]> = [];
    for (let i = 0; i < markerIds.rows; i++) {
      // Use center of each marker
      const c = markerCorners.get(i);
      let cx = 0, cy = 0;
      for (let j = 0; j < 4; j++) {
        cx += c.floatAt(0, j * 2);
        cy += c.floatAt(0, j * 2 + 1);
      }
      corners.push([cx / 4, cy / 4]);
      c.delete();
    }

    const expected = expectedCount(spec);
    const found = corners.length >= expected;

    markerCorners.delete();
    markerIds.delete();
    detectorParams.delete();

    return { found, corners };
  } catch {
    return { found: false, corners: [] };
  }
}

function getDictionary(cv: any, dictName: string): any {
  const dictMap: Record<string, number> = {
    'DICT_4X4_50': cv.aruco_DICT_4X4_50 ?? 0,
    'DICT_4X4_100': cv.aruco_DICT_4X4_100 ?? 1,
    'DICT_4X4_250': cv.aruco_DICT_4X4_250 ?? 2,
    'DICT_5X5_50': cv.aruco_DICT_5X5_50 ?? 4,
    'DICT_5X5_100': cv.aruco_DICT_5X5_100 ?? 5,
    'DICT_5X5_250': cv.aruco_DICT_5X5_250 ?? 6,
    'DICT_6X6_50': cv.aruco_DICT_6X6_50 ?? 8,
    'DICT_6X6_100': cv.aruco_DICT_6X6_100 ?? 9,
    'DICT_6X6_250': cv.aruco_DICT_6X6_250 ?? 10,
    'DICT_APRILTAG_36h11': cv.aruco_DICT_APRILTAG_36h11 ?? 17,
    'DICT_ARUCO_ORIGINAL': cv.aruco_DICT_ARUCO_ORIGINAL ?? 20,
  };
  const id = dictMap[dictName] ?? 10;
  return cv.aruco_getPredefinedDictionary(id);
}

/**
 * Draw detected corners on a canvas overlay.
 */
export function drawCorners(
  ctx: CanvasRenderingContext2D,
  corners: Array<[number, number]>,
  scaleX: number,
  scaleY: number,
  found: boolean,
): void {
  const color = found ? '#00C853' : '#E60012';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  for (let i = 0; i < corners.length; i++) {
    const [x, y] = corners[i];
    const sx = x * scaleX;
    const sy = y * scaleY;

    // Cross marker
    ctx.beginPath();
    ctx.moveTo(sx - 6, sy);
    ctx.lineTo(sx + 6, sy);
    ctx.moveTo(sx, sy - 6);
    ctx.lineTo(sx, sy + 6);
    ctx.stroke();

    // Index label
    ctx.font = '10px monospace';
    ctx.fillText(String(i), sx + 8, sy - 4);
  }
}
