/**
 * Calibration quality analysis.
 * Parses calibration results (OpenCV format) and computes statistics.
 * Pure math — no OpenCV.js or DOM needed.
 */

export interface CalibrationData {
  /** Camera matrix [[fx, 0, cx], [0, fy, cy], [0, 0, 1]] */
  cameraMatrix: number[][];
  /** Distortion coefficients [k1, k2, p1, p2, k3, ...] */
  distCoeffs: number[];
  /** Image width in pixels */
  imageWidth: number;
  /** Image height in pixels */
  imageHeight: number;
  /** Per-image reprojection errors */
  perViewErrors: number[];
  /** Overall RMS reprojection error */
  rmsError: number;
  /** Number of images used */
  imageCount: number;
}

export interface QualityReport {
  /** Overall quality score 0-100. */
  score: number;
  /** Quality grade: excellent / good / fair / poor. */
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  /** Camera intrinsics summary. */
  intrinsics: IntrinsicsSummary;
  /** Distortion summary. */
  distortion: DistortionSummary;
  /** Reprojection error statistics. */
  reprojection: ReprojectionSummary;
  /** List of specific findings / warnings. */
  findings: Finding[];
}

export interface IntrinsicsSummary {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  /** Focal length aspect ratio fx/fy — should be ~1.0 for square pixels. */
  focalRatio: number;
  /** Principal point offset from image center in pixels. */
  ppOffsetX: number;
  ppOffsetY: number;
}

export interface DistortionSummary {
  k1: number;
  k2: number;
  p1: number;
  p2: number;
  k3: number;
  /** Max radial distortion at image corners (pixels). */
  maxRadialPx: number;
  /** Whether distortion is barrel (k1 < 0) or pincushion (k1 > 0). */
  type: 'barrel' | 'pincushion' | 'mixed';
}

export interface ReprojectionSummary {
  rms: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  /** Indices of images with error > 2× median (outlier candidates). */
  outlierIndices: number[];
}

export interface Finding {
  severity: 'info' | 'warning' | 'error';
  message: string;
}

/**
 * Parse calibration data from OpenCV-style JSON.
 * Handles both opencv_storage XML-to-JSON and direct JSON from calib.tools.
 */
export function parseCalibrationData(text: string): CalibrationData {
  const obj = JSON.parse(text);

  // Direct format
  if (obj.camera_matrix || obj.cameraMatrix) {
    const cm = obj.camera_matrix ?? obj.cameraMatrix;
    const matrix = Array.isArray(cm) ? cm : cm.data
      ? [cm.data.slice(0, 3), cm.data.slice(3, 6), cm.data.slice(6, 9)]
      : [[cm.fx, 0, cm.cx], [0, cm.fy, cm.cy], [0, 0, 1]];

    const dc = obj.dist_coeffs ?? obj.distCoeffs ?? obj.distortion_coefficients ?? [];
    const distCoeffs = Array.isArray(dc) ? (Array.isArray(dc[0]) ? dc[0] : dc) : dc.data ?? [];

    return {
      cameraMatrix: matrix,
      distCoeffs,
      imageWidth: obj.image_width ?? obj.imageWidth ?? obj.width ?? 1920,
      imageHeight: obj.image_height ?? obj.imageHeight ?? obj.height ?? 1080,
      perViewErrors: obj.per_view_errors ?? obj.perViewErrors ?? [],
      rmsError: obj.rms_error ?? obj.rmsError ?? obj.rms ?? 0,
      imageCount: obj.image_count ?? obj.imageCount ?? (obj.per_view_errors ?? obj.perViewErrors ?? []).length,
    };
  }

  throw new Error('Unrecognized calibration data format. Expected JSON with camera_matrix and dist_coeffs.');
}

/**
 * Analyze calibration quality and produce a report.
 */
export function analyzeQuality(data: CalibrationData): QualityReport {
  const findings: Finding[] = [];

  // Intrinsics
  const fx = data.cameraMatrix[0][0];
  const fy = data.cameraMatrix[1][1];
  const cx = data.cameraMatrix[0][2];
  const cy = data.cameraMatrix[1][2];
  const focalRatio = fx / fy;
  const ppOffsetX = cx - data.imageWidth / 2;
  const ppOffsetY = cy - data.imageHeight / 2;

  const intrinsics: IntrinsicsSummary = { fx, fy, cx, cy, focalRatio, ppOffsetX, ppOffsetY };

  // Focal ratio check
  if (Math.abs(focalRatio - 1.0) > 0.01) {
    findings.push({ severity: 'warning', message: `Focal length ratio fx/fy = ${focalRatio.toFixed(4)} deviates from 1.0. Non-square pixels or calibration issue.` });
  }

  // Principal point check
  const maxPpOffset = Math.max(Math.abs(ppOffsetX), Math.abs(ppOffsetY));
  if (maxPpOffset > data.imageWidth * 0.05) {
    findings.push({ severity: 'warning', message: `Principal point is ${maxPpOffset.toFixed(1)} px from image center (>${(data.imageWidth * 0.05).toFixed(0)} px threshold).` });
  }

  // Distortion
  const dc = data.distCoeffs;
  const k1 = dc[0] ?? 0;
  const k2 = dc[1] ?? 0;
  const p1 = dc[2] ?? 0;
  const p2 = dc[3] ?? 0;
  const k3 = dc[4] ?? 0;

  // Estimate max radial distortion at corners
  const cornerR = Math.sqrt(
    Math.pow(data.imageWidth / 2, 2) + Math.pow(data.imageHeight / 2, 2),
  ) / fx;
  const r2 = cornerR * cornerR;
  const r4 = r2 * r2;
  const r6 = r4 * r2;
  const radialFactor = Math.abs(k1 * r2 + k2 * r4 + k3 * r6);
  const maxRadialPx = radialFactor * Math.sqrt(Math.pow(data.imageWidth / 2, 2) + Math.pow(data.imageHeight / 2, 2));

  const distType = k1 < -0.001 ? 'barrel' : k1 > 0.001 ? 'pincushion' : 'mixed';
  const distortion: DistortionSummary = { k1, k2, p1, p2, k3, maxRadialPx, type: distType };

  if (maxRadialPx > 50) {
    findings.push({ severity: 'info', message: `High radial distortion (~${maxRadialPx.toFixed(0)} px at corners). Normal for wide-angle lenses.` });
  }

  if (Math.abs(p1) > 0.01 || Math.abs(p2) > 0.01) {
    findings.push({ severity: 'warning', message: `Tangential distortion is significant (p1=${p1.toFixed(4)}, p2=${p2.toFixed(4)}). Check lens/sensor alignment.` });
  }

  // Reprojection errors
  const errors = data.perViewErrors.length > 0 ? data.perViewErrors : [data.rmsError];
  const sorted = [...errors].sort((a, b) => a - b);
  const mean = errors.reduce((s, e) => s + e, 0) / errors.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const stdDev = Math.sqrt(errors.reduce((s, e) => s + (e - mean) ** 2, 0) / errors.length);
  const outlierIndices = errors
    .map((e, i) => (e > median * 2 ? i : -1))
    .filter((i) => i >= 0);

  const reprojection: ReprojectionSummary = {
    rms: data.rmsError || Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length),
    mean, median, stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    outlierIndices,
  };

  if (reprojection.rms > 1.0) {
    findings.push({ severity: 'error', message: `RMS reprojection error (${reprojection.rms.toFixed(3)} px) is high. Re-calibrate with better images.` });
  } else if (reprojection.rms > 0.5) {
    findings.push({ severity: 'warning', message: `RMS reprojection error (${reprojection.rms.toFixed(3)} px) is moderate. Consider removing outlier images.` });
  } else {
    findings.push({ severity: 'info', message: `RMS reprojection error (${reprojection.rms.toFixed(3)} px) is good.` });
  }

  if (outlierIndices.length > 0) {
    findings.push({ severity: 'warning', message: `${outlierIndices.length} image(s) have >2× median error: indices ${outlierIndices.join(', ')}. Consider removing them.` });
  }

  if (data.imageCount < 10) {
    findings.push({ severity: 'warning', message: `Only ${data.imageCount} images used. 15-30 images recommended for reliable calibration.` });
  }

  // Score
  let score = 100;
  if (reprojection.rms > 0.1) score -= Math.min(30, (reprojection.rms - 0.1) * 40);
  if (Math.abs(focalRatio - 1.0) > 0.005) score -= Math.min(10, Math.abs(focalRatio - 1.0) * 500);
  if (maxPpOffset > 10) score -= Math.min(10, (maxPpOffset - 10) * 0.5);
  if (outlierIndices.length > 0) score -= outlierIndices.length * 3;
  if (data.imageCount < 15) score -= (15 - data.imageCount) * 2;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const grade: QualityReport['grade'] = score >= 85 ? 'excellent' : score >= 65 ? 'good' : score >= 45 ? 'fair' : 'poor';

  return { score, grade, intrinsics, distortion, reprojection, findings };
}
