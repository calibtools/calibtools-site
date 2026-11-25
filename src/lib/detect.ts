/**
 * Detection check: find the markers of a pattern in a photo with OpenCV.js and compare them with the pattern.
 *
 * Reads the four pattern types that carry markers: ChArUco, ArUco grid, AprilGrid and marker sheets. The
 * OpenCV.js build has no checkerboard-corner or circle-grid detector (see ./opencv.ts), so those types are
 * not offered here.
 *
 * What to look for comes from the pattern, through the same functions the generator draws and labels with:
 * the dictionary or tag family (markerSource / sheetSource), the border width and the IDs (markerIds). There
 * is no fallback: a dictionary this build does not know is an error, not another dictionary.
 */
import type { PatternSpec } from './patterns';
import { markerIds } from './idRange';
import { sheetSource } from './renderMarkerSheet';

/** Pattern types the detection check reads. */
export const CHECKABLE_TYPES = ['ChArUco', 'ArUco grid', 'AprilGrid (Kalibr)', 'Marker sheet'] as const;

export function canCheck(type: PatternSpec['type']): boolean {
  return (CHECKABLE_TYPES as readonly string[]).includes(type);
}

/** What the marker detector is set to for a pattern, in OpenCV's terms. */
export interface DetectorSettings {
  /** cv.aruco predefined dictionary, e.g. DICT_6X6_250 or DICT_APRILTAG_16h5. */
  dictionary: string;
  /** cv.aruco.DetectorParameters.markerBorderBits. */
  borderBits: number;
  /** Every ID on the pattern, in the pattern's own order. */
  ids: number[];
}

export function detectorSettings(spec: PatternSpec): DetectorSettings {
  if (!canCheck(spec.type)) throw new Error(`The detection check reads patterns with markers. ${spec.type} has none it can look for.`);
  const ids = markerIds(spec) ?? [];
  if (spec.type === 'AprilGrid (Kalibr)') return { dictionary: `DICT_APRILTAG_${spec.aprilFamily ?? '36h11'}`, borderBits: spec.borderBits ?? 2, ids };
  if (spec.type === 'Marker sheet') { const s = sheetSource(spec); return { dictionary: s.name, borderBits: s.borderBits, ids }; }
  return { dictionary: spec.dict, borderBits: 1, ids };
}

export interface FoundMarker {
  id: number;
  /** Four corners in image pixels, clockwise from the marker's top-left. */
  corners: Array<[number, number]>;
  /** False when the dictionary has this ID but the pattern does not. */
  onPattern: boolean;
}

export interface DetectionResult {
  /** True when every marker of the pattern was read and, on a ChArUco board, every inner corner was placed. */
  found: boolean;
  markersExpected: number;
  markersFound: number;
  /** IDs of the pattern that were not read. */
  missingIds: number[];
  /** IDs that were read but are not on the pattern. */
  unexpectedIds: number[];
  /** ChArUco only: inner corners placed and expected. */
  cornersFound?: number;
  cornersExpected?: number;
  markers: FoundMarker[];
  /** ChArUco only: inner corners in image pixels. */
  corners: Array<[number, number]>;
  settings: DetectorSettings;
  timeMs: number;
  message: string;
}

/** An image as a canvas gives it: RGBA, 8 bits a channel, row by row. */
export interface RgbaImage { data: Uint8ClampedArray | Uint8Array; width: number; height: number }

/** The longer side the detector works on. A 12-megapixel photo is scaled down to this first; found points are scaled back. */
export const DETECT_MAX_SIDE = 2400;

/**
 * Find the pattern's markers in an image.
 * @param cv     the loaded OpenCV.js module (./opencv.ts)
 * @param image  RGBA pixels
 * @param spec   the pattern on the board
 */
export function detectPattern(cv: any, image: RgbaImage, spec: PatternSpec): DetectionResult {
  const t0 = Date.now();
  const settings = detectorSettings(spec);
  const dictId = cv[settings.dictionary];
  if (typeof dictId !== 'number' && typeof dictId?.value !== 'number') {
    throw new Error(`This detector has no dictionary ${settings.dictionary}.`);
  }

  const bin: any[] = []; // every OpenCV object made here, freed at the end
  const keep = <T>(o: T): T => { bin.push(o); return o; };
  try {
    const rgba = keep(cv.matFromArray(image.height, image.width, cv.CV_8UC4, image.data));
    const grayFull = keep(new cv.Mat());
    cv.cvtColor(rgba, grayFull, cv.COLOR_RGBA2GRAY);
    const scale = Math.min(1, DETECT_MAX_SIDE / Math.max(image.width, image.height));
    let gray = grayFull;
    if (scale < 1) {
      gray = keep(new cv.Mat());
      cv.resize(grayFull, gray, new cv.Size(Math.round(image.width * scale), Math.round(image.height * scale)), 0, 0, cv.INTER_AREA);
    }

    const dict = keep(cv.getPredefinedDictionary(dictId));
    const params = keep(new cv.aruco_DetectorParameters());
    params.markerBorderBits = settings.borderBits;
    const refine = keep(new cv.aruco_RefineParameters(10, 3, true));
    const markerCorners = keep(new cv.MatVector());
    const markerIdMat = keep(new cv.Mat());
    const corners: Array<[number, number]> = [];
    let cornersFound: number | undefined, cornersExpected: number | undefined;

    if (spec.type === 'ChArUco') {
      const idMat = keep(cv.matFromArray(settings.ids.length, 1, cv.CV_32SC1, settings.ids));
      const board = keep(new cv.aruco_CharucoBoard(new cv.Size(spec.cols, spec.rows), spec.square, spec.marker, dict, idMat));
      if (spec.legacyLayout) board.setLegacyPattern(true);
      const detector = keep(new cv.aruco_CharucoDetector(board, keep(new cv.aruco_CharucoParameters()), params, refine));
      const cc = keep(new cv.Mat()), ci = keep(new cv.Mat());
      detector.detectBoard(gray, cc, ci, markerCorners, markerIdMat);
      cornersExpected = (spec.rows - 1) * (spec.cols - 1);
      cornersFound = ci.rows;
      for (let i = 0; i < cc.rows; i++) corners.push([cc.data32F[2 * i] / scale, cc.data32F[2 * i + 1] / scale]);
    } else {
      const detector = keep(new cv.aruco_ArucoDetector(dict, params, refine));
      const rejected = keep(new cv.MatVector());
      detector.detectMarkers(gray, markerCorners, markerIdMat, rejected);
    }

    const onPattern = new Set(settings.ids);
    const markers: FoundMarker[] = [];
    for (let i = 0; i < markerIdMat.rows; i++) {
      const m = markerCorners.get(i);
      const pts: Array<[number, number]> = [];
      for (let k = 0; k < 4; k++) pts.push([m.data32F[2 * k] / scale, m.data32F[2 * k + 1] / scale]);
      m.delete();
      const id = markerIdMat.data32S[i];
      markers.push({ id, corners: pts, onPattern: onPattern.has(id) });
    }
    const read = new Set(markers.map((m) => m.id));
    const missingIds = settings.ids.filter((id) => !read.has(id));
    const unexpectedIds = [...read].filter((id) => !onPattern.has(id)).sort((a, b) => a - b);
    const markersFound = settings.ids.length - missingIds.length;
    const found = missingIds.length === 0 && (cornersExpected === undefined || cornersFound === cornersExpected);

    return {
      found, markersExpected: settings.ids.length, markersFound, missingIds, unexpectedIds,
      cornersFound, cornersExpected, markers, corners, settings,
      timeMs: Date.now() - t0,
      message: resultMessage(spec, { found, markersFound, markersExpected: settings.ids.length, cornersFound, cornersExpected, unexpected: unexpectedIds.length }),
    };
  } finally {
    for (const o of bin) { try { o.delete(); } catch { /* already freed */ } }
  }
}

function resultMessage(spec: PatternSpec, r: { found: boolean; markersFound: number; markersExpected: number; cornersFound?: number; cornersExpected?: number; unexpected: number }): string {
  const noun = spec.type === 'AprilGrid (Kalibr)' ? 'tags' : 'markers';
  const cornerText = r.cornersExpected === undefined ? '' : ` and ${r.cornersFound} of ${r.cornersExpected} inner corners`;
  if (r.found) return `Read all ${r.markersExpected} ${noun}${r.cornersExpected === undefined ? '' : ` and all ${r.cornersExpected} inner corners`}.`;
  if (r.markersFound === 0 && r.unexpected === 0) return `No ${noun} read. Check that the pattern settings match the board, then look at focus, light and how large the board is in the photo.`;
  if (r.markersFound === 0) return `Read ${r.unexpected} ${noun} of this dictionary, but none with an ID of this pattern. Check the start ID, rows and columns.`;
  return `Read ${r.markersFound} of ${r.markersExpected} ${noun}${cornerText}.`;
}

/** Draw what was read over the photo: marker outlines with their IDs, and ChArUco corners. */
export function drawDetection(ctx: CanvasRenderingContext2D, result: DetectionResult): void {
  const unit = Math.max(ctx.canvas.width, ctx.canvas.height) / 1000;
  ctx.lineJoin = 'round';
  for (const m of result.markers) {
    ctx.strokeStyle = m.onPattern ? '#16a34a' : '#E60012';
    ctx.lineWidth = Math.max(2, 3 * unit);
    ctx.beginPath();
    m.corners.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.stroke();
    const cx = m.corners.reduce((s, p) => s + p[0], 0) / 4, cy = m.corners.reduce((s, p) => s + p[1], 0) / 4;
    const size = Math.max(11, Math.min(Math.hypot(m.corners[1][0] - m.corners[0][0], m.corners[1][1] - m.corners[0][1]) * 0.35, 28 * unit));
    ctx.font = `600 ${size}px "Geist Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size / 5);
    ctx.strokeStyle = '#fff';
    ctx.strokeText(String(m.id), cx, cy);
    ctx.fillStyle = m.onPattern ? '#166534' : '#B3000E';
    ctx.fillText(String(m.id), cx, cy);
  }
  ctx.fillStyle = '#16a34a';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1, unit);
  for (const [x, y] of result.corners) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(3, 4 * unit), 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
}
