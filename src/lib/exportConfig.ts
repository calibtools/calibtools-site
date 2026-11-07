/**
 * Config file exports for calibration toolchains.
 * Pure string generators — no DOM, no side effects.
 */
import type { PatternSpec } from './patterns';
import { BRAND_NAME, SITE_URL, patternSummary, provenanceLine } from './exportBrand';
import { idRange } from './idRange';
import { innerCorners } from './patterns';

function brandHeader(s: PatternSpec, commentChar = '#'): string {
  const summary = patternSummary(s);
  const provenance = provenanceLine('generator');
  return [
    `${commentChar} ${summary}`,
    `${commentChar} ${provenance}`,
    commentChar,
  ].join('\n');
}

/** Pattern types Kalibr can use directly (aprilgrid, checkerboard, symmetric circlegrid). */
export function kalibrSupported(s: PatternSpec): boolean {
  if (s.type === 'Checkerboard' || s.type === 'AprilGrid (Kalibr)') return true;
  if (s.type === 'Symmetric circles') {
    const sx = s.circleSpacingX ?? s.square;
    const sy = s.circleSpacingY ?? s.square;
    return sx === sy;
  }
  return false;
}

/**
 * Kalibr (ethz-asl) YAML target config.
 * Format: https://github.com/ethz-asl/kalibr/wiki/calibration-targets
 *
 * checkerboard: targetRows/targetCols = number of INTERNAL corners
 *               (rows-1 × cols-1 for a rows×cols grid of squares).
 * aprilgrid:    tagRows/tagCols = number of tags.
 * circlegrid:   targetRows/targetCols = number of circles.
 *
 * Kalibr has no ChArUco, ArUco or HALCON target model; those throw.
 */
export function kalibrYaml(s: PatternSpec): string {
  if (!kalibrSupported(s)) {
    throw new Error(`Kalibr has no target model for ${s.type}. Use an AprilGrid, checkerboard or symmetric circle grid.`);
  }
  const lines: string[] = [brandHeader(s), ''];

  if (s.type === 'Checkerboard') {
    lines.push('target_type: \'checkerboard\'');
    lines.push(`targetRows: ${s.rows - 1}   # internal corners`);
    lines.push(`targetCols: ${s.cols - 1}   # internal corners`);
    lines.push(`rowSpacingMeters: ${(s.square / 1000).toFixed(6)}`);
    lines.push(`colSpacingMeters: ${(s.square / 1000).toFixed(6)}`);
  } else if (s.type === 'AprilGrid (Kalibr)') {
    lines.push('target_type: \'aprilgrid\'');
    lines.push(`tagRows: ${s.rows}`);
    lines.push(`tagCols: ${s.cols}`);
    lines.push(`tagSize: ${(s.square / 1000).toFixed(6)}`);
    lines.push(`tagSpacing: ${(s.tagSpacing ?? s.marker / s.square).toFixed(6)}`);
    if (s.aprilFamily) lines.push(`# tagFamily: ${s.aprilFamily}`);
    if (s.borderBits) lines.push(`# borderBits: ${s.borderBits}`);
  } else {
    lines.push('target_type: \'circlegrid\'');
    lines.push(`targetRows: ${s.rows}   # circles`);
    lines.push(`targetCols: ${s.cols}   # circles`);
    lines.push(`spacingMeters: ${((s.circleSpacingX ?? s.square) / 1000).toFixed(6)}`);
    lines.push('asymmetricGrid: False');
  }

  const range = idRange(s);
  if (range) {
    lines.push(`# id_range: ${range.min}-${range.max} (${range.count} markers)`);
  }

  return lines.join('\n') + '\n';
}

/**
 * ROS 2 camera_calibration YAML.
 * Used by: ros2 run camera_calibration cameracalibrator --size RxC --square S
 * The YAML is a convenience file; the CLI flags are the primary interface.
 */
export function ros2Yaml(s: PatternSpec): string {
  const innerRows = s.rows - 1;
  const innerCols = s.cols - 1;
  const lines: string[] = [
    brandHeader(s),
    `# ROS 2 camera_calibration target config`,
    `# Usage: ros2 run camera_calibration cameracalibrator --size ${innerCols}x${innerRows} --square ${(s.square / 1000).toFixed(4)}`,
    ``,
    `image_width: 0    # set to your camera resolution`,
    `image_height: 0   # set to your camera resolution`,
    ``,
    `board:`,
    `  type: ${s.type === 'Checkerboard' ? 'chessboard' : s.type === 'ChArUco' ? 'charuco' : 'chessboard'}`,
    `  rows: ${innerRows}`,
    `  cols: ${innerCols}`,
    `  square_size: ${(s.square / 1000).toFixed(6)}  # meters`,
  ];

  if (s.type === 'ChArUco' || s.type === 'ArUco grid') {
    lines.push(`  marker_size: ${(s.marker / 1000).toFixed(6)}  # meters`);
    lines.push(`  dictionary: ${s.dict}`);
    lines.push(`  start_id: ${s.startId}`);
  }

  const range = idRange(s);
  if (range) {
    lines.push(`  # id_range: ${range.min}-${range.max} (${range.count} markers)`);
  }

  if (s.finderMarkers) {
    lines.push(`# Finder markers enabled (OpenCV CALIB_CB_MARKER flag)`);
  }

  lines.push('');
  return lines.join('\n') + '\n';
}

/** Pattern types exported as a HALCON point-based calibration object. */
export function halconSupported(s: PatternSpec): boolean {
  return s.type === 'Checkerboard' || s.type === 'ChArUco';
}

/**
 * HALCON calibration object as HDevelop code.
 *
 * HALCON's .descr / .cpd files only describe MVTec circle-mark plates
 * (gen_caltab / create_caltab). For checkerboards and ChArUco boards HALCON
 * takes the 3D points directly: set_calib_data_calib_object(CalibDataID, 0,
 * [X1..Xn, Y1..Yn, Z1..Zn]), with image points supplied through
 * set_calib_data_observ_points.
 * Ref: https://www.mvtec.com/doc/halcon/2311/en/set_calib_data_calib_object.html
 *
 * Points are the inner corners in meters, row-major (innerCorners() order,
 * = cv.findChessboardCorners order = ChArUco corner IDs), origin at the
 * top-left square corner, x right, y down, z = 0.
 */
export function halconCode(s: PatternSpec): string {
  if (!halconSupported(s)) {
    throw new Error(`HALCON point export supports checkerboard and ChArUco only, not ${s.type}.`);
  }
  const pts = innerCorners(s.rows, s.cols, s.square);
  const fmt = (v: number) => (v / 1000).toFixed(6);
  const chunk = (vals: string[]) => {
    const out: string[] = [];
    for (let i = 0; i < vals.length; i += 10) out.push('      ' + vals.slice(i, i + 10).join(', '));
    return out.join(',\n');
  };
  const header = brandHeader(s, '*');
  const lines = [
    header,
    `* HALCON calibration object: ${s.rows - 1} x ${s.cols - 1} inner corners, ${s.square} mm squares (${pts.length} points).`,
    '* Units: meters. Origin: top-left square corner, x right, y down, z = 0.',
    s.type === 'ChArUco'
      ? '* Point order = OpenCV ChArUco corner IDs (row-major). Detect corners with OpenCV, then pass them in this order.'
      : '* Point order = cv.findChessboardCorners (row-major).',
    '* find_calib_object only finds MVTec circle plates; supply image points with set_calib_data_observ_points.',
    '',
    'X := [',
    chunk(pts.map(([x]) => fmt(x))),
    '     ]',
    'Y := [',
    chunk(pts.map(([, y]) => fmt(y))),
    '     ]',
    'tuple_gen_const (|X|, 0.0, Z)',
    '',
    "create_calib_data ('calibration_object', 1, 1, CalibDataID)",
    '* set_calib_data_cam_param (CalibDataID, 0, [], StartCamParam)',
    'set_calib_data_calib_object (CalibDataID, 0, [X, Y, Z])',
    '* For each image: set_calib_data_observ_points (CalibDataID, 0, 0, PoseIdx, Rows, Cols, \'all\', StartPose)',
    '* calibrate_cameras (CalibDataID, Error)',
    '',
  ];
  return lines.join('\n');
}

/**
 * OpenCV-compatible JSON config with brand metadata.
 */
export function opencvJson(s: PatternSpec): string {
  const summary = patternSummary(s);
  const obj: Record<string, unknown> = {
    _generator: {
      name: BRAND_NAME,
      url: `https://${SITE_URL}`,
      generated: new Date().toISOString().slice(0, 10),
      pattern: summary,
    },
    pattern: s.type,
    rows: s.rows,
    cols: s.cols,
    square_mm: s.square,
    marker_mm: s.marker,
    dictionary: s.dict,
    start_id: s.startId,
  };
  const range = idRange(s);
  if (range) {
    obj.id_range = [range.min, range.max];
  }
  if (s.finderMarkers) obj.marker = true;
  // OpenCV ≤ 4.5 ChArUco layout: call board.setLegacyPattern(True) in OpenCV ≥ 4.6
  if (s.legacyLayout && (s.type === 'ChArUco' || s.type === 'ArUco grid')) obj.legacy_pattern = true;
  if (s.radonCheckers) obj.radon = true;
  if (s.invert) obj.inverted = true;
  if (s.showAxes !== false) {
    const isKalibr = s.type === 'AprilGrid (Kalibr)' && s.symmetricCorners;
    obj.axes = {
      frame: isKalibr ? 'kalibr' : 'opencv',
      origin: isKalibr ? 'bottom-left' : 'top-left',
    };
  }
  return JSON.stringify(obj, null, 2);
}
