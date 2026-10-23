/**
 * Config file exports for calibration toolchains.
 * Pure string generators — no DOM, no side effects.
 */
import type { PatternSpec } from './patterns';
import { BRAND_NAME, BRAND_URL, patternSummary } from './brand';

function brandHeader(s: PatternSpec, commentChar = '#'): string {
  const summary = patternSummary(s);
  const date = new Date().toISOString().slice(0, 10);
  return [
    `${commentChar} ${summary} · generated ${date} · ${BRAND_URL}`,
    `${commentChar} Patterns and files © ${BRAND_NAME}, free to use; targets available at ${BRAND_URL}/targets`,
    commentChar,
  ].join('\n');
}

/**
 * Kalibr (ethz-asl) YAML target config.
 * Format: https://github.com/ethz-asl/kalibr/wiki/calibration-targets
 *
 * Kalibr uses (rows-1)×(cols-1) for checkerboard inner corners,
 * and rows×cols for the grid of squares in aprilgrid/checkerboard.
 */
export function kalibrYaml(s: PatternSpec): string {
  const lines: string[] = [brandHeader(s), ''];

  if (s.type === 'Checkerboard') {
    lines.push('target_type: \'checkerboard\'');
    lines.push(`targetRows: ${s.rows}`);
    lines.push(`targetCols: ${s.cols}`);
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
    // ChArUco and others: use checkerboard representation
    lines.push('target_type: \'checkerboard\'');
    lines.push(`targetRows: ${s.rows}`);
    lines.push(`targetCols: ${s.cols}`);
    lines.push(`rowSpacingMeters: ${(s.square / 1000).toFixed(6)}`);
    lines.push(`colSpacingMeters: ${(s.square / 1000).toFixed(6)}`);
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
    `  square_size: ${(s.square / 1000).toFixed(6)}  # metres`,
  ];

  if (s.type === 'ChArUco' || s.type === 'ArUco grid') {
    lines.push(`  marker_size: ${(s.marker / 1000).toFixed(6)}  # metres`);
    lines.push(`  dictionary: ${s.dict}`);
    lines.push(`  start_id: ${s.startId}`);
  }

  if (s.finderMarkers) {
    lines.push(`# Finder markers enabled (OpenCV CALIB_CB_MARKER flag)`);
  }

  lines.push('');
  return lines.join('\n') + '\n';
}

/**
 * HALCON calibration plate description file.
 * Format: https://www.mvtec.com/doc/halcon/latest/en/create_caltab.html
 *
 * HALCON uses a specific .descr format with plate dimensions and mark positions.
 */
export function halconDescr(s: PatternSpec): string {
  const bw = s.cols * s.square;
  const bh = s.rows * s.square;
  const lines: string[] = [
    brandHeader(s),
    `# HALCON Calibration Plate Description`,
    `# Plate dimensions in metres`,
    ``,
    `# calibration plate description, version 2`,
    ``,
    `# number of marks in x- and y-direction`,
    `x_marks ${s.cols - 1}`,
    `y_marks ${s.rows - 1}`,
    ``,
    `# width and height of a cell [m]`,
    `cell_width  ${(s.square / 1000).toFixed(6)}`,
    `cell_height ${(s.square / 1000).toFixed(6)}`,
    ``,
    `# plate size [m]`,
    `plate_width  ${(bw / 1000).toFixed(6)}`,
    `plate_height ${(bh / 1000).toFixed(6)}`,
    ``,
    `# mark positions (row col) — inner corners, row-major`,
  ];

  for (let r = 0; r < s.rows - 1; r++) {
    for (let c = 0; c < s.cols - 1; c++) {
      lines.push(`${r} ${c}`);
    }
  }

  if (s.finderMarkers) {
    lines.push('');
    lines.push(`# Note: 3 circular finder markers at corners (OpenCV CALIB_CB_MARKER)`);
  }

  lines.push('');
  return lines.join('\n') + '\n';
}

/**
 * OpenCV-compatible JSON config with brand metadata.
 */
export function opencvJson(s: PatternSpec): string {
  const summary = patternSummary(s);
  const obj: Record<string, unknown> = {
    _generator: {
      name: BRAND_NAME,
      url: `https://${BRAND_URL}`,
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
  if (s.finderMarkers) obj.marker = true;
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
