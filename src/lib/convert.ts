/**
 * Calibration config format converter.
 * Parses: OpenCV JSON, Kalibr YAML, ROS 2 YAML.
 * Serializes to those plus HALCON (HDevelop point tuple, output only).
 * Round-trip error < 1e-9 for numeric values.
 */
import type { PatternSpec } from './patterns';
import { kalibrYaml, ros2Yaml, halconCode, opencvJson } from './exportConfig';

/**
 * What a file describes: the whole pattern, as the generator holds it, without the page it is printed on.
 *
 * It used to be seven fields (type, rows, columns, square, marker, dictionary, start ID). Everything else a
 * file said was dropped on the way in, so a tag16h5 AprilGrid came out as a Kalibr file, which Kalibr cannot
 * read, and a marker sheet came out as a ChArUco board. Now every field is kept and every output is written
 * by the generator's own functions, which refuse what the target tool cannot use.
 */
export type CalibConfig = Omit<PatternSpec, 'paper' | 'scaleBar'>;

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

/** The pattern a config describes, on a page, as the generator's functions take it. */
export function toSpec(config: CalibConfig): PatternSpec {
  return { ...config, paper: 'A4', scaleBar: true };
}

/** Serialize canonical config to the target format. Throws, with the reason, when the target tool cannot use the pattern. */
export function serialize(config: CalibConfig, format: Format): string {
  const spec = toSpec(config);
  switch (format) {
    case 'opencv-json':
      return opencvJson(spec) + '\n';
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

const TYPES: readonly PatternSpec['type'][] = ['Checkerboard', 'ChArUco', 'AprilGrid (Kalibr)', 'Asymmetric circles', 'Symmetric circles', 'ArUco grid', 'HALCON-style dots', 'Marker sheet', 'PuzzleBoard'];

/** Reads what opencvJson() writes, field for field, and the plainer JSON this page wrote before 2026-11-25. */
function parseOpencvJson(text: string): CalibConfig {
  const obj = JSON.parse(text);
  const named = obj.pattern ?? obj.type ?? 'ChArUco';
  const type = (TYPES as readonly string[]).includes(named) ? named as PatternSpec['type'] : mapPatternType(String(named));
  const size = obj.square_mm ?? obj.square ?? obj.squareSize;
  const ids: number[] | undefined = Array.isArray(obj.ids) ? obj.ids : undefined;
  const out: CalibConfig = {
    type, rows: obj.rows, cols: obj.cols, square: size, marker: 0, dict: '',
    startId: ids ? ids[0] : (obj.start_id ?? obj.startId ?? 0),
  };
  const hasMarkers = type === 'ChArUco' || type === 'ArUco grid' || type === 'Marker sheet';
  if (hasMarkers) {
    out.marker = obj.marker_mm ?? obj.marker ?? obj.markerSize ?? 0;
    out.dict = obj.dictionary ?? obj.dict ?? 'DICT_6X6_250';
  }
  if (type === 'ChArUco' && obj.legacy_pattern) out.legacyLayout = true;
  if (type === 'Marker sheet') {
    out.square = out.marker;
    // A sheet of AprilTags is written as OpenCV's DICT_APRILTAG_<family> with its border width.
    const fam = /^DICT_APRILTAG_(\S+)$/.exec(out.dict)?.[1];
    if (fam) { out.aprilFamily = fam; out.borderBits = obj.border_bits ?? 1; }
    if (ids) out.tagIdList = ids.join(',');
  }
  if (type === 'AprilGrid (Kalibr)') {
    out.square = obj.tag_size_mm ?? size;
    out.aprilFamily = String(obj.tag_family ?? 'tag36h11').replace(/^tag/, '');
    out.borderBits = obj.border_bits ?? 2;
    // Older files of this page carried the gap in mm as marker_mm.
    const gap = obj.tag_gap_mm ?? obj.marker_mm;
    out.tagSpacing = obj.tag_spacing ?? (gap > 0 && out.square > 0 ? gap / out.square : 0.3);
    if (obj.corner_squares) out.symmetricCorners = true;
    if (ids) out.tagIdList = ids.join(',');
  }
  if (type === 'Checkerboard') {
    if (obj.marker === true) out.finderMarkers = true;
    if (obj.radon) out.radonCheckers = true;
  }
  const circles = type === 'Symmetric circles' || type === 'Asymmetric circles' || type === 'HALCON-style dots';
  if (circles) {
    if (obj.spacing_y_mm !== undefined) { out.circleSpacingX = size; out.circleSpacingY = obj.spacing_y_mm; }
    if (obj.circle_diameter_mm !== undefined) out.circleDiameter = obj.circle_diameter_mm;
  }
  if (obj.inverted && (circles || type === 'Checkerboard')) out.invert = true;
  return out;
}

function parseKalibrYaml(text: string): CalibConfig {
  const v = yamlValues(text);
  const targetType = v['target_type']?.replace(/['"]/g, '') ?? 'checkerboard';

  if (targetType === 'aprilgrid') {
    // Kalibr's AprilGrid is tag36h11 with a two-bit border and IDs from 0; the file has no field for anything else.
    return {
      type: 'AprilGrid (Kalibr)',
      rows: num(v['tagRows']), cols: num(v['tagCols']),
      square: num(v['tagSize']) * 1000,
      marker: 0, dict: '', startId: 0,
      aprilFamily: '36h11', borderBits: 2,
      tagSpacing: v['tagSpacing'] ? num(v['tagSpacing']) : 0.3,
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
      marker: 0, dict: '', startId: 0,
    };
  }
  // checkerboard: targetRows/targetCols are internal corners → squares = +1
  return {
    type: 'Checkerboard',
    rows: num(v['targetRows']) + 1,
    cols: num(v['targetCols']) + 1,
    square: num(v['rowSpacingMeters'] ?? v['colSpacingMeters']) * 1000,
    marker: 0, dict: '', startId: 0,
  };
}

function parseRos2Yaml(text: string): CalibConfig {
  const v = yamlValues(text);
  const boardType = v['type'] ?? 'chessboard';
  const cols = num(v['cols']), rows = num(v['rows']);
  const square = num(v['square_size']) * 1000;
  const plain = { square, marker: 0, dict: '', startId: 0 };

  // Files written before 2026-11-12 have no `size` line and give interior corners for every pattern.
  const counted = v['size'] !== undefined;
  if (boardType.includes('charuco')) {
    const board = { square, marker: v['marker_size'] ? num(v['marker_size']) * 1000 : 0, dict: v['dictionary'] ?? 'DICT_6X6_250', startId: v['start_id'] ? num(v['start_id']) : 0 };
    return counted ? { type: 'ChArUco', rows, cols, ...board } : { type: 'ChArUco', rows: rows + 1, cols: cols + 1, ...board };
  }
  if (boardType === 'acircles') return { type: 'Asymmetric circles', rows, cols: cols * 2, ...plain };
  if (boardType === 'circles') return { type: 'Symmetric circles', rows, cols, ...plain };
  // chessboard: interior corners, so squares = +1
  return { type: 'Checkerboard', rows: rows + 1, cols: cols + 1, ...plain };
}

// --- Helpers ---

function mapPatternType(s: string): PatternSpec['type'] {
  const lower = s.toLowerCase();
  if (lower.includes('charuco')) return 'ChArUco';
  if (lower.includes('april')) return 'AprilGrid (Kalibr)';
  if (lower.includes('checker') || lower.includes('chess')) return 'Checkerboard';
  if (lower.includes('asym')) return 'Asymmetric circles';
  if (lower.includes('circle') || lower.includes('sym')) return 'Symmetric circles';
  if (lower.includes('sheet')) return 'Marker sheet';
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
