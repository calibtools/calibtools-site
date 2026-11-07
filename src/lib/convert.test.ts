import { describe, it, expect } from 'vitest';
import { parse, serialize, convert, detectFormat, type CalibConfig } from './convert';

const canonical: CalibConfig = {
  type: 'ChArUco',
  rows: 7,
  cols: 10,
  square: 25,
  marker: 18,
  dict: 'DICT_6X6_250',
  startId: 0,
};

const opencvJson = JSON.stringify({
  pattern: 'ChArUco',
  rows: 7,
  cols: 10,
  square_mm: 25,
  marker_mm: 18,
  dictionary: 'DICT_6X6_250',
  start_id: 0,
  generator: 'Calib.Tools',
}, null, 2);

describe('detectFormat', () => {
  it('detects OpenCV JSON', () => {
    expect(detectFormat(opencvJson)).toBe('opencv-json');
  });

  it('detects Kalibr YAML', () => {
    expect(detectFormat("target_type: 'checkerboard'\ntargetRows: 7")).toBe('kalibr-yaml');
  });

  it('detects ROS 2 YAML', () => {
    expect(detectFormat('board:\n  type: chessboard\n  rows: 6\n  cols: 9\n  square_size: 0.025000')).toBe('ros2-yaml');
  });

  it('does not treat HALCON text as an input format', () => {
    expect(detectFormat('x_marks 9\ny_marks 6\ncell_width 0.025000')).toBeNull();
  });

  it('returns null for unknown', () => {
    expect(detectFormat('random garbage')).toBeNull();
  });
});

describe('parse → serialize round-trip', () => {
  it('OpenCV JSON round-trips', () => {
    const config = parse(opencvJson, 'opencv-json');
    expect(config.type).toBe('ChArUco');
    expect(config.rows).toBe(7);
    expect(config.cols).toBe(10);
    expect(config.square).toBe(25);
    expect(config.marker).toBe(18);

    const back = parse(serialize(config, 'opencv-json'), 'opencv-json');
    expect(back.rows).toBe(config.rows);
    expect(back.cols).toBe(config.cols);
    expect(Math.abs(back.square - config.square)).toBeLessThan(1e-9);
    expect(Math.abs(back.marker - config.marker)).toBeLessThan(1e-9);
  });

  it('Kalibr YAML round-trips for checkerboard', () => {
    const checkerConfig: CalibConfig = { ...canonical, type: 'Checkerboard', marker: 0 };
    const yaml = serialize(checkerConfig, 'kalibr-yaml');
    const back = parse(yaml, 'kalibr-yaml');
    expect(back.rows).toBe(checkerConfig.rows);
    expect(back.cols).toBe(checkerConfig.cols);
    expect(Math.abs(back.square - checkerConfig.square)).toBeLessThan(1e-6);
  });

  it('Kalibr YAML round-trips for AprilGrid', () => {
    const aprilConfig: CalibConfig = { ...canonical, type: 'AprilGrid (Kalibr)', dict: 'DICT_APRILTAG_36h11' };
    const yaml = serialize(aprilConfig, 'kalibr-yaml');
    const back = parse(yaml, 'kalibr-yaml');
    expect(back.rows).toBe(aprilConfig.rows);
    expect(back.cols).toBe(aprilConfig.cols);
    expect(Math.abs(back.square - aprilConfig.square)).toBeLessThan(1e-6);
    expect(back.type).toBe('AprilGrid (Kalibr)');
  });

  it('ROS 2 YAML round-trips for ChArUco', () => {
    const yaml = serialize(canonical, 'ros2-yaml');
    const back = parse(yaml, 'ros2-yaml');
    expect(back.rows).toBe(canonical.rows);
    expect(back.cols).toBe(canonical.cols);
    expect(Math.abs(back.square - canonical.square)).toBeLessThan(1e-6);
    expect(Math.abs(back.marker - canonical.marker)).toBeLessThan(1e-6);
  });

  it('Kalibr checkerboard: targetRows are internal corners', () => {
    const back = parse("target_type: 'checkerboard'\ntargetRows: 6\ntargetCols: 9\nrowSpacingMeters: 0.025\ncolSpacingMeters: 0.025", 'kalibr-yaml');
    expect(back.rows).toBe(7);
    expect(back.cols).toBe(10);
  });

  it('Kalibr circlegrid round-trips', () => {
    const circ: CalibConfig = { ...canonical, type: 'Symmetric circles', rows: 6, cols: 8, square: 20, marker: 0 };
    const back = parse(serialize(circ, 'kalibr-yaml'), 'kalibr-yaml');
    expect(back.type).toBe('Symmetric circles');
    expect(back.rows).toBe(6);
    expect(back.cols).toBe(8);
    expect(Math.abs(back.square - 20)).toBeLessThan(1e-6);
  });

  it('HALCON is output only', () => {
    const code = serialize({ ...canonical, type: 'Checkerboard', marker: 0 }, 'halcon-hdev');
    expect(code).toContain('set_calib_data_calib_object');
    expect(() => parse(code, 'halcon-hdev')).toThrow(/output format only/);
  });
});

describe('cross-format conversion', () => {
  it('OpenCV JSON (ChArUco) → Kalibr YAML is refused: Kalibr has no ChArUco model', () => {
    expect(() => convert(opencvJson, 'kalibr-yaml', 'opencv-json')).toThrow(/no target model/);
  });

  it('OpenCV JSON (checkerboard) → Kalibr YAML → back preserves values', () => {
    const json = JSON.stringify({ pattern: 'Checkerboard', rows: 7, cols: 10, square_mm: 25 });
    const kalibr = convert(json, 'kalibr-yaml', 'opencv-json');
    expect(kalibr).toMatch(/targetRows: 6\b/);
    const back = parse(kalibr, 'kalibr-yaml');
    expect(back.rows).toBe(7);
    expect(back.cols).toBe(10);
    expect(Math.abs(back.square - 25)).toBeLessThan(1e-6);
  });

  it('OpenCV JSON → ROS 2 YAML → OpenCV JSON preserves values', () => {
    const ros = convert(opencvJson, 'ros2-yaml', 'opencv-json');
    const back = parse(ros, 'ros2-yaml');
    expect(back.rows).toBe(7);
    expect(back.cols).toBe(10);
    expect(Math.abs(back.square - 25)).toBeLessThan(1e-6);
    expect(Math.abs(back.marker - 18)).toBeLessThan(1e-6);
  });

  it('OpenCV JSON (ChArUco) → HALCON lists 54 corner points', () => {
    const halcon = convert(opencvJson, 'halcon-hdev', 'opencv-json');
    const xs = halcon.match(/^X := \[([\s\S]*?)\]/m)![1].split(',');
    expect(xs).toHaveLength(54);
  });
});
