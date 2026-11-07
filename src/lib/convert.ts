/**
 * Calibration config format converter.
 * Parses: OpenCV JSON, Kalibr YAML, ROS 2 YAML.
 * Serializes to those plus HALCON (HDevelop point tuple, output only).
 * Round-trip error < 1e-9 for numeric values.
 */
import type { PatternSpec } from './patterns';
import { kalibrYaml, ros2Yaml, halconCode } from './exportConfig';

/** Canonical internal representation — a subset of PatternSpec. */
export interface CalibConfig {
  type: PatternSpec['type'];
  rows: number;
  cols: number;
  square: number;   // mm
  marker: number;   // mm
  dict: string;
  startId: number;
}

export type Format = 'opencv-json' | 'kalibr-yaml' | 'ros2-yaml' | 'halcon-hdev';

/** Formats that can be read as input (HALCON is output only). */
export const INPUT_FORMATS: Format[] = ['opencv-json', 'kalibr-yaml', 'ros2-yaml'];

/** Detect format from raw text. */
export function detectFormat(text: string): Format | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return 'opencv-json';
  if (trimmed.includes('target_type:')) return 'kalibr-yaml';
  if (trimmed.includes('board:') || trimmed.includes('square_size:')) return 'ros2-yaml';
  return null;
}

/** Parse any supported format into canonical CalibConfig. */
export function parse(text: string, format?: Format): CalibConfig {
  const fmt = format ?? detectFormat(text);
  if (!fmt) throw new Error('Could not detect format. Paste a valid OpenCV JSON, Kalibr YAML or ROS 2 YAML file.');
  switch (fmt) {
    case 'opencv-json': return parseOpencvJson(text);
    case 'kalibr-yaml': return parseKalibrYaml(text);
    case 'ros2-yaml': return parseRos2Yaml(text);
    case 'halcon-hdev': throw new Error('HALCON code is an output format only.');
  }
}

/** Serialize canonical config to the target format. */
export function serialize(config: CalibConfig, format: Format): string {
  const spec: PatternSpec = {
    ...config,
    paper: 'A4',
    scaleBar: true,
  };
  switch (format) {
    case 'opencv-json':
      return JSON.stringify({
        pattern: config.type,
        rows: config.rows,
        cols: config.cols,
        square_mm: config.square,
        marker_mm: config.marker,
        dictionary: config.dict,
        start_id: config.startId,
        generator: 'Calib.Tools',
      }, null, 2) + '\n';
    case 'kalibr-yaml':
      return kalibrYaml(spec);
    case 'ros2-yaml':
      return ros2Yaml(spec);
    case 'halcon-hdev':
      return halconCode(spec);
  }
}

/** Convert text from one format to another. */
export function convert(text: string, to: Format, from?: Format): string {
  return serialize(parse(text, from), to);
}

// --- Parsers ---

function parseOpencvJson(text: string): CalibConfig {
  const obj = JSON.parse(text);
  return {
    type: mapPatternType(obj.pattern ?? obj.type ?? 'ChArUco'),
    rows: obj.rows,
    cols: obj.cols,
    square: obj.square_mm ?? obj.square ?? obj.squareSize,
    marker: obj.marker_mm ?? obj.marker ?? obj.markerSize ?? 0,
    dict: obj.dictionary ?? obj.dict ?? 'DICT_6X6_250',
    startId: obj.start_id ?? obj.startId ?? 0,
  };
}

function parseKalibrYaml(text: string): CalibConfig {
  const v = yamlValues(text);
  const targetType = v['target_type']?.replace(/['"]/g, '') ?? 'checkerboard';

  if (targetType === 'aprilgrid') {
    const square = num(v['tagSize']) * 1000;
    return {
      type: 'AprilGrid (Kalibr)',
      rows: num(v['tagRows']), cols: num(v['tagCols']),
      square,
      marker: v['tagSpacing'] ? square * num(v['tagSpacing']) : 0,
      dict: 'DICT_APRILTAG_36h11',
      startId: 0,
    };
  }
  if (targetType === 'circlegrid') {
    if (/true/i.test(v['asymmetricGrid'] ?? '')) {
      throw new Error('Asymmetric Kalibr circle grids are not supported by the converter.');
    }
    return {
      type: 'Symmetric circles',
      rows: num(v['targetRows']), cols: num(v['targetCols']),
      square: num(v['spacingMeters']) * 1000,
      marker: 0, dict: 'DICT_6X6_250', startId: 0,
    };
  }
  // checkerboard: targetRows/targetCols are internal corners → squares = +1
  return {
    type: 'Checkerboard',
    rows: num(v['targetRows']) + 1,
    cols: num(v['targetCols']) + 1,
    square: num(v['rowSpacingMeters'] ?? v['colSpacingMeters']) * 1000,
    marker: 0, dict: 'DICT_6X6_250', startId: 0,
  };
}

function parseRos2Yaml(text: string): CalibConfig {
  const v = yamlValues(text);
  const boardType = v['type'] ?? 'chessboard';
  const innerRows = num(v['rows']);
  const innerCols = num(v['cols']);
  const squareM = num(v['square_size']);
  const square = squareM * 1000;

  let marker = 0;
  let dict = 'DICT_6X6_250';
  let startId = 0;
  if (v['marker_size']) {
    marker = num(v['marker_size']) * 1000;
  }
  if (v['dictionary']) dict = v['dictionary'];
  if (v['start_id']) startId = num(v['start_id']);

  let type: PatternSpec['type'] = 'Checkerboard';
  if (boardType.includes('charuco')) type = 'ChArUco';

  return {
    type,
    rows: innerRows + 1,
    cols: innerCols + 1,
    square, marker, dict, startId,
  };
}

// --- Helpers ---

function mapPatternType(s: string): PatternSpec['type'] {
  const lower = s.toLowerCase();
  if (lower.includes('charuco')) return 'ChArUco';
  if (lower.includes('april')) return 'AprilGrid (Kalibr)';
  if (lower.includes('checker') || lower.includes('chess')) return 'Checkerboard';
  if (lower.includes('asym')) return 'Asymmetric circles';
  if (lower.includes('circle') || lower.includes('sym')) return 'Symmetric circles';
  if (lower.includes('aruco')) return 'ArUco grid';
  if (lower.includes('halcon') || lower.includes('dot')) return 'HALCON-style dots';
  return 'ChArUco';
}

/** Extract key: value pairs from simple YAML (ignoring comments and nested structure). */
function yamlValues(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.replace(/#.*$/, '').trim();
    const m = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}

function num(s: string | undefined): number {
  if (!s) return 0;
  return parseFloat(s);
}

/** Human-readable format labels. */
export const FORMAT_LABELS: Record<Format, string> = {
  'opencv-json': 'OpenCV JSON',
  'kalibr-yaml': 'Kalibr YAML',
  'ros2-yaml': 'ROS 2 YAML',
  'halcon-hdev': 'HALCON (HDevelop points)',
};
