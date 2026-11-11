/**
 * Config file exports for calibration toolchains.
 * Pure string generators — no DOM, no side effects.
 */
import type { PatternSpec } from './patterns';
import { BRAND_NAME, SITE_URL, patternSummary, provenanceLine } from './exportBrand';
import { idRange } from './idRange';
import { innerCorners } from './patterns';
import { isKalibrFrame } from './renderAprilGrid';

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
  if (s.type === 'Checkerboard') return true;
  // Kalibr's AprilGrid detector is built for tag36h11 with a two-bit black border and takes neither as a setting
  // (GridCalibrationTargetAprilgrid.cpp: AprilTags::tagCodes36h11, blackTagBorder = 2).
  if (s.type === 'AprilGrid (Kalibr)') return (s.aprilFamily ?? '36h11') === '36h11' && (s.borderBits ?? 2) === 2;
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
    throw new Error(`Kalibr has no target model for ${s.type}. Use a tag36h11 AprilGrid with a two-bit border, a checkerboard or a symmetric circle grid.`);
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
    lines.push(`tagSpacing: ${(s.tagSpacing ?? 0.3).toFixed(6)}`);
    lines.push('# tag36h11, two-bit border; first ID at the bottom-left tag');
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

/** `--aruco_dict` value of ROS camera_calibration for an OpenCV dictionary name, or null when the calibrator has no such dictionary. */
export function rosArucoDict(dict: string): string | null {
  if (dict === 'DICT_ARUCO_ORIGINAL') return 'aruco_orig';
  const m = /^DICT_([4-7])X\1_(50|100|250|1000)$/.exec(dict);
  return m ? `${m[1]}x${m[1]}_${m[2]}` : null;
}

/**
 * Why ROS camera_calibration cannot use this target, or null when it can.
 * The calibrator (ros-perception/image_pipeline, camera_calibration) knows four patterns:
 * chessboard, circles, acircles and charuco. Its ChArUco board is cv2.aruco.CharucoBoard with
 * marker IDs from 0 in the current OpenCV layout, so a start ID or the legacy layout on an
 * even-row board describes a board it will not find.
 */
export function ros2Unsupported(s: PatternSpec): string | null {
  const sx = s.circleSpacingX ?? s.square, sy = s.circleSpacingY ?? s.square;
  switch (s.type) {
    case 'Checkerboard':
      return null;
    case 'ChArUco':
      if (!rosArucoDict(s.dict)) return `ROS camera_calibration has no dictionary ${s.dict}.`;
      if (s.startId !== 0) return 'ROS camera_calibration builds its ChArUco board with marker IDs from 0; this board starts at another ID.';
      if (s.legacyLayout && s.rows % 2 === 0) return 'ROS camera_calibration uses the current OpenCV ChArUco layout; this board uses the legacy layout.';
      return null;
    case 'Symmetric circles':
      return sx === sy ? null : 'ROS camera_calibration takes one spacing for both directions.';
    case 'Asymmetric circles':
      if (sx !== sy) return 'ROS camera_calibration takes one spacing for both directions.';
      return s.cols % 2 === 0 ? null : 'An asymmetric grid needs the same number of circles in every row.';
    default:
      return `ROS camera_calibration has no pattern for ${s.type}. It supports chessboard, circles, acircles and charuco.`;
  }
}

export function ros2Supported(s: PatternSpec): boolean {
  return ros2Unsupported(s) === null;
}

/**
 * Settings for ROS 2 camera_calibration (cameracalibrator).
 * The calibrator takes them as command-line options and does not read a file; the YAML carries the
 * same values, with the full command in the header.
 *
 * What --size counts, per pattern (camera_calibration/calibrator.py and nodes/cameracalibrator.py):
 * - chessboard: interior corners, columns x rows;
 * - charuco:    squares, columns x rows (it calls CharucoBoard((n_cols, n_rows), square, marker, dict));
 * - circles:    circles, columns x rows (findCirclesGrid((n_cols, n_rows)));
 * - acircles:   circles per row x rows; --square is the lattice pitch, the object points are
 *               (2 * column + row % 2) * square by row * square.
 */
export function ros2Yaml(s: PatternSpec): string {
  const why = ros2Unsupported(s);
  if (why) throw new Error(why);
  const m = (mm: number) => (mm / 1000).toFixed(6);
  let type: string, cols: number, rows: number, counts: string;
  const square = s.type === 'Symmetric circles' || s.type === 'Asymmetric circles' ? (s.circleSpacingX ?? s.square) : s.square;
  if (s.type === 'Checkerboard') { type = 'chessboard'; cols = s.cols - 1; rows = s.rows - 1; counts = 'interior corners'; }
  else if (s.type === 'ChArUco') { type = 'charuco'; cols = s.cols; rows = s.rows; counts = 'squares'; }
  else if (s.type === 'Symmetric circles') { type = 'circles'; cols = s.cols; rows = s.rows; counts = 'circles'; }
  else { type = 'acircles'; cols = s.cols / 2; rows = s.rows; counts = 'circles per row x rows'; }

  const flags = [`--pattern ${type}`, `--size ${cols}x${rows}`, `--square ${(square / 1000).toFixed(4)}`];
  if (s.type === 'ChArUco') flags.push(`--charuco_marker_size ${(s.marker / 1000).toFixed(4)}`, `--aruco_dict ${rosArucoDict(s.dict)}`);

  const lines: string[] = [
    brandHeader(s),
    '# ROS 2 camera_calibration settings for this target.',
    '# cameracalibrator takes them as command-line options; it does not read this file:',
    `#   ros2 run camera_calibration cameracalibrator ${flags.join(' ')} --ros-args -r image:=/camera/image_raw -p camera:=/camera`,
    '',
    'board:',
    `  type: ${type}`,
    `  size: ${cols}x${rows}   # ${counts}, columns x rows`,
    `  cols: ${cols}`,
    `  rows: ${rows}`,
    `  square_size: ${m(square)}  # meters${type === 'acircles' ? ', lattice pitch (half the distance between circles in one row)' : type === 'circles' ? ', center to center' : ''}`,
  ];
  if (s.type === 'ChArUco') {
    lines.push(`  marker_size: ${m(s.marker)}  # meters`);
    lines.push(`  aruco_dict: ${rosArucoDict(s.dict)}`);
    lines.push(`  dictionary: ${s.dict}`);
    const range = idRange(s);
    if (range) lines.push(`  # id_range: ${range.min}-${range.max} (${range.count} markers)`);
  }
  if (s.finderMarkers) lines.push('# Finder markers are printed on the board; camera_calibration ignores them.');
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
 * Board definition as JSON, with what each OpenCV call needs for this pattern type and nothing
 * that does not apply to it (a checkerboard has no dictionary, an AprilGrid has no ArUco one).
 */
export function opencvJson(s: PatternSpec): string {
  const summary = patternSummary(s);
  const circles = s.type === 'Symmetric circles' || s.type === 'Asymmetric circles' || s.type === 'HALCON-style dots';
  const aruco = s.type === 'ChArUco' || s.type === 'ArUco grid' || s.type === 'Marker sheet';
  const sx = s.circleSpacingX ?? s.square, sy = s.circleSpacingY ?? s.square;
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
    // Circle grids: the pitch between lattice positions along x.
    square_mm: circles ? sx : s.square,
  };
  if (aruco) {
    obj.marker_mm = s.marker;
    obj.dictionary = s.dict;
    obj.start_id = s.startId;
  }
  if (s.type === 'Checkerboard') obj.opencv_pattern_size = [s.cols - 1, s.rows - 1]; // findChessboardCorners: interior corners, (columns, rows)
  if (s.type === 'ChArUco') obj.opencv_board_size = [s.cols, s.rows]; // CharucoBoard: squares, (columns, rows)
  if (s.type === 'AprilGrid (Kalibr)') {
    const ratio = s.tagSpacing ?? 0.3;
    obj.tag_family = `tag${s.aprilFamily ?? '36h11'}`;
    obj.tag_size_mm = s.square;
    obj.tag_spacing = ratio;                 // Kalibr tagSpacing: gap / tag side
    obj.tag_gap_mm = Math.round(s.square * ratio * 1e6) / 1e6;
    obj.border_bits = s.borderBits ?? 2;
    obj.start_id = s.startId;
    obj.id_order = 'first ID at the bottom-left tag, left to right, then upward (Kalibr)';
    if (s.symmetricCorners) obj.corner_squares = true;
  }
  // findCirclesGrid takes (points per row, rows). For an asymmetric grid the lattice holds a
  // circle at every other position, so a row has cols / 2 circles.
  if (s.type === 'Symmetric circles') obj.opencv_pattern_size = [s.cols, s.rows];
  if (s.type === 'Asymmetric circles' && s.cols % 2 === 0) obj.opencv_pattern_size = [s.cols / 2, s.rows];
  if (circles) {
    if (sy !== sx) obj.spacing_y_mm = sy;
    obj.circle_diameter_mm = s.circleDiameter ?? s.square * 0.56;
  }
  if (s.type === 'Symmetric circles' || s.type === 'Asymmetric circles') {
    obj.opencv_flag = s.type === 'Symmetric circles' ? 'CALIB_CB_SYMMETRIC_GRID' : 'CALIB_CB_ASYMMETRIC_GRID';
  }
  const range = idRange(s);
  if (range) {
    obj.id_range = [range.min, range.max];
  }
  if (s.finderMarkers) obj.marker = true;
  // OpenCV <= 4.5 ChArUco layout: call board.setLegacyPattern(True) in OpenCV >= 4.6. It only differs on boards with an even number of rows.
  if (s.legacyLayout && (s.type === 'ChArUco' || s.type === 'ArUco grid')) obj.legacy_pattern = true;
  if (s.radonCheckers) obj.radon = true;
  if (s.invert) obj.inverted = true;
  if (s.showAxes !== false) {
    const isKalibr = isKalibrFrame(s);
    obj.axes = {
      frame: isKalibr ? 'kalibr' : 'opencv',
      origin: isKalibr ? 'bottom-left' : 'top-left',
    };
  }
  return JSON.stringify(obj, null, 2);
}
