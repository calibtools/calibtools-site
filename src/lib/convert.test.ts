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
  generator: 'calib.tools',
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

  it('detects HALCON descr', () => {
    expect(detectFormat('x_marks 9\ny_marks 6\ncell_width 0.025000')).toBe('halcon-descr');
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

  it('HALCON descr round-trips', () => {
    const checkerConfig: CalibConfig = { ...canonical, type: 'Checkerboard', marker: 0 };
    const descr = serialize(checkerConfig, 'halcon-descr');
    const back = parse(descr, 'halcon-descr');
    expect(back.rows).toBe(checkerConfig.rows);
    expect(back.cols).toBe(checkerConfig.cols);
    expect(Math.abs(back.square - checkerConfig.square)).toBeLessThan(1e-6);
  });
});

describe('cross-format conversion', () => {
  it('OpenCV JSON → Kalibr YAML → OpenCV JSON preserves values', () => {
    const kalibr = convert(opencvJson, 'kalibr-yaml', 'opencv-json');
    expect(kalibr).toContain('targetRows: 7');

    // Kalibr doesn't preserve ChArUco type, but dimensions survive
    const backConfig = parse(kalibr, 'kalibr-yaml');
    expect(backConfig.rows).toBe(7);
    expect(backConfig.cols).toBe(10);
    expect(Math.abs(backConfig.square - 25)).toBeLessThan(1e-6);
  });

  it('OpenCV JSON → ROS 2 YAML → OpenCV JSON preserves values', () => {
    const ros = convert(opencvJson, 'ros2-yaml', 'opencv-json');
    const back = parse(ros, 'ros2-yaml');
    expect(back.rows).toBe(7);
    expect(back.cols).toBe(10);
    expect(Math.abs(back.square - 25)).toBeLessThan(1e-6);
    expect(Math.abs(back.marker - 18)).toBeLessThan(1e-6);
  });

  it('OpenCV JSON → HALCON → OpenCV JSON preserves grid dimensions', () => {
    const halcon = convert(opencvJson, 'halcon-descr', 'opencv-json');
    const back = parse(halcon, 'halcon-descr');
    expect(back.rows).toBe(7);
    expect(back.cols).toBe(10);
    expect(Math.abs(back.square - 25)).toBeLessThan(1e-6);
  });
});
