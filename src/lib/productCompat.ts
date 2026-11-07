/**
 * Per-family software compatibility and digital-file lists for product pages.
 * Kept honest: config files come from the free pattern generator, and each
 * row states only what the toolchain actually supports (see exportConfig.ts).
 */
export interface CompatRow { tool: string; note: string }

type FamilyKey = 'charuco' | 'checkerboard' | 'aprilgrid' | 'circlegrid' | 'halcon';

export function familyOf(handle: string): FamilyKey | null {
  for (const k of ['charuco', 'checkerboard', 'aprilgrid', 'circlegrid', 'halcon'] as FamilyKey[]) {
    if (handle.startsWith(`${k}-`)) return k;
  }
  return null;
}

const COMPAT: Record<FamilyKey, CompatRow[]> = {
  charuco: [
    { tool: 'OpenCV', note: '≥ 4.6 · cv.aruco.CharucoBoard / CharucoDetector' },
    { tool: 'ROS 2', note: 'camera_calibration with the ChArUco pattern' },
    { tool: 'MATLAB', note: 'detectCharucoBoardPoints (R2024a or later)' },
    { tool: 'HALCON', note: 'Corner point tuple for set_calib_data_calib_object' },
    { tool: 'Kalibr', note: 'No ChArUco target model; use an AprilGrid' },
  ],
  checkerboard: [
    { tool: 'OpenCV', note: 'findChessboardCornersSB' },
    { tool: 'ROS 2', note: 'camera_calibration with the chessboard pattern' },
    { tool: 'MATLAB', note: 'Camera Calibrator app' },
    { tool: 'Kalibr', note: 'checkerboard target (rows and columns as inner corners)' },
    { tool: 'HALCON', note: 'Corner point tuple for set_calib_data_calib_object' },
  ],
  aprilgrid: [
    { tool: 'Kalibr', note: 'aprilgrid target, tag family 36h11' },
    { tool: 'OpenCV', note: 'cv.aruco with DICT_APRILTAG_36h11 (tag detection)' },
    { tool: 'MATLAB', note: 'readAprilTag (tag detection)' },
  ],
  circlegrid: [
    { tool: 'OpenCV', note: 'findCirclesGrid (symmetric and asymmetric)' },
    { tool: 'Kalibr', note: 'circlegrid target (symmetric grids)' },
    { tool: 'MATLAB', note: 'detectCircleGridPoints' },
    { tool: 'HALCON', note: 'Circle centers as a point tuple for set_calib_data_calib_object' },
  ],
  halcon: [
    { tool: 'HALCON', note: 'find_calib_object with the supplied .descr file' },
  ],
};

const GENERATOR = 'from the free pattern generator';

const FILES: Record<FamilyKey, string[]> = {
  charuco: ['Datasheet PDF', `OpenCV JSON · ROS 2 YAML ${GENERATOR}`, `HALCON point tuple ${GENERATOR}`, 'DXF drawing on request'],
  checkerboard: ['Datasheet PDF', `OpenCV JSON · Kalibr YAML · ROS 2 YAML ${GENERATOR}`, `HALCON point tuple ${GENERATOR}`, 'DXF drawing on request'],
  aprilgrid: ['Datasheet PDF', `Kalibr YAML · OpenCV JSON ${GENERATOR}`, 'DXF drawing on request'],
  circlegrid: ['Datasheet PDF', `OpenCV JSON ${GENERATOR}`, `Kalibr YAML for symmetric grids ${GENERATOR}`, 'DXF drawing on request'],
  halcon: ['Datasheet PDF', 'HALCON .descr calibration plate description', 'DXF drawing on request'],
};

/** Compatibility rows: content override first, then family default, else none. */
export function compatRows(handle: string, override?: CompatRow[]): CompatRow[] {
  if (override && override.length) return override;
  const f = familyOf(handle);
  return f ? COMPAT[f] : [];
}

/** Digital files listed on the product page. */
export function digitalFiles(handle: string): string[] {
  const f = familyOf(handle);
  return f ? FILES[f] : ['Datasheet PDF', 'Measurement data as stated in your quote'];
}
