import { describe, it, expect } from 'vitest';
import { kalibrYaml, kalibrSupported, ros2Yaml, ros2Supported, ros2Unsupported, rosArucoDict, halconCode, halconSupported, opencvJson } from './exportConfig';
import { innerCorners } from './patterns';
import type { PatternSpec } from './patterns';
import { markerForSquare } from './boardSizes';

const checker: PatternSpec = {
  type: 'Checkerboard', rows: 7, cols: 10, square: 25, marker: markerForSquare(25),
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

const charuco: PatternSpec = { ...checker, type: 'ChArUco' };
const aprilgrid: PatternSpec = { ...checker, type: 'AprilGrid (Kalibr)' };

describe('kalibrYaml', () => {
  it('checkerboard uses target_type checkerboard', () => {
    const y = kalibrYaml(checker);
    expect(y).toContain("target_type: 'checkerboard'");
    // Kalibr counts INTERNAL corners: 7×10 squares → 6×9 corners
    expect(y).toMatch(/targetRows: 6\b/);
    expect(y).toMatch(/targetCols: 9\b/);
    expect(y).toContain('rowSpacingMeters: 0.025000');
  });

  it('symmetric circle grid uses target_type circlegrid with circle counts', () => {
    const y = kalibrYaml({ ...checker, type: 'Symmetric circles', rows: 6, cols: 8, square: 20 });
    expect(y).toContain("target_type: 'circlegrid'");
    expect(y).toMatch(/targetRows: 6\b/);
    expect(y).toMatch(/targetCols: 8\b/);
    expect(y).toContain('spacingMeters: 0.020000');
    expect(y).toContain('asymmetricGrid: False');
  });

  it('is not offered for ChArUco, ArUco grid or HALCON-style dots', () => {
    expect(kalibrSupported(charuco)).toBe(false);
    expect(kalibrSupported({ ...checker, type: 'ArUco grid' })).toBe(false);
    expect(kalibrSupported({ ...checker, type: 'HALCON-style dots' })).toBe(false);
    expect(kalibrSupported({ ...checker, type: 'Asymmetric circles' })).toBe(false);
    expect(() => kalibrYaml(charuco)).toThrow(/no target model/);
  });

  it('aprilgrid uses target_type aprilgrid with tagSpacing', () => {
    const y = kalibrYaml(aprilgrid);
    expect(y).toContain("target_type: 'aprilgrid'");
    expect(y).toContain('tagRows: 7');
    // The gap the file states is the gap the renderer draws: 0.3 of the tag side unless tagSpacing is set.
    expect(y).toContain('tagSpacing: 0.300000');
    expect(kalibrYaml({ ...aprilgrid, tagSpacing: 0.25 })).toContain('tagSpacing: 0.250000');
  });

  it('contains generator attribution', () => {
    expect(kalibrYaml(checker)).toContain('calib.tools/tools/generator');
  });
});

describe('ros2Yaml', () => {
  // What --size counts comes from ros-perception/image_pipeline, camera_calibration (calibrator.py, cameracalibrator.py).
  it('chessboard: interior corners, columns x rows', () => {
    const y = ros2Yaml(checker);
    expect(y).toContain('type: chessboard');
    expect(y).toContain('size: 9x6');
    expect(y).toContain('--pattern chessboard --size 9x6 --square 0.0250');
    expect(y).toContain('square_size: 0.025000');
  });

  it('charuco: squares, columns x rows, with marker size and the dictionary key the calibrator takes', () => {
    const y = ros2Yaml(charuco);
    expect(y).toContain('type: charuco');
    expect(y).toContain('size: 10x7');
    expect(y).toContain('--pattern charuco --size 10x7 --square 0.0250 --charuco_marker_size 0.0180 --aruco_dict 6x6_250');
    expect(y).toContain('marker_size: 0.018000');
    expect(y).toContain('aruco_dict: 6x6_250');
    expect(y).toContain('dictionary: DICT_6X6_250');
  });

  it('circles: number of circles, columns x rows, center-to-center spacing', () => {
    const y = ros2Yaml({ ...checker, type: 'Symmetric circles', rows: 10, cols: 14, square: 25 });
    expect(y).toContain('--pattern circles --size 14x10 --square 0.0250');
  });

  it('acircles: circles per row x rows, lattice pitch', () => {
    const y = ros2Yaml({ ...checker, type: 'Asymmetric circles', rows: 11, cols: 8, square: 20 });
    expect(y).toContain('--pattern acircles --size 4x11 --square 0.0200');
  });

  it('maps OpenCV dictionary names to the calibrator keys', () => {
    expect(rosArucoDict('DICT_4X4_50')).toBe('4x4_50');
    expect(rosArucoDict('DICT_7X7_1000')).toBe('7x7_1000');
    expect(rosArucoDict('DICT_ARUCO_ORIGINAL')).toBe('aruco_orig');
    expect(rosArucoDict('DICT_APRILTAG_36h11')).toBeNull();
    expect(rosArucoDict('DICT_4X4_5X5')).toBeNull();
  });

  it('is not offered for targets the calibrator cannot use, and says why', () => {
    const no = (over: Partial<PatternSpec>) => ros2Unsupported({ ...charuco, ...over });
    expect(ros2Supported(checker)).toBe(true);
    expect(ros2Supported(charuco)).toBe(true);
    expect(no({ type: 'AprilGrid (Kalibr)' })).toMatch(/no pattern for AprilGrid/);
    expect(no({ type: 'ArUco grid' })).toMatch(/no pattern/);
    expect(no({ type: 'Marker sheet' })).toMatch(/no pattern/);
    expect(no({ dict: 'DICT_APRILTAG_36h11' })).toMatch(/no dictionary/);
    expect(no({ startId: 35 })).toMatch(/IDs from 0/);
    expect(no({ rows: 6, legacyLayout: true })).toMatch(/legacy layout/);
    expect(no({ rows: 7, legacyLayout: true })).toBeNull(); // odd rows: both layouts are the same board
    expect(no({ type: 'Asymmetric circles', rows: 5, cols: 7 })).toMatch(/same number of circles/);
    expect(no({ type: 'Symmetric circles', circleSpacingX: 20, circleSpacingY: 25 })).toMatch(/one spacing/);
    expect(() => ros2Yaml({ ...charuco, type: 'AprilGrid (Kalibr)' })).toThrow();
  });
});

describe('opencvJson carries what applies to the pattern type', () => {
  const j = (s: PatternSpec) => JSON.parse(opencvJson(s));
  it('checkerboard: interior-corner size, no marker or dictionary', () => {
    const o = j(checker);
    expect(o.opencv_pattern_size).toEqual([9, 6]);
    expect(o).not.toHaveProperty('dictionary');
    expect(o).not.toHaveProperty('marker_mm');
  });
  it('ChArUco: board size in squares, marker, dictionary, start ID', () => {
    const o = j(charuco);
    expect(o.opencv_board_size).toEqual([10, 7]);
    expect(o).toMatchObject({ marker_mm: 18, dictionary: 'DICT_6X6_250', start_id: 0 });
  });
  it('AprilGrid: tag family, size, gap and ID order; no ArUco dictionary', () => {
    const o = j({ ...aprilgrid, rows: 6, cols: 8, square: 35, tagSpacing: 0.3, dict: 'DICT_6X6_250' });
    expect(o).toMatchObject({ tag_family: 'tag36h11', tag_size_mm: 35, tag_spacing: 0.3, tag_gap_mm: 10.5, border_bits: 2, start_id: 0, id_range: [0, 47] });
    expect(o.id_order).toMatch(/bottom-left/);
    expect(o.axes).toEqual({ frame: 'kalibr', origin: 'bottom-left' });
    expect(o).not.toHaveProperty('dictionary');
    expect(o).not.toHaveProperty('marker_mm');
  });
  it('circle grids: the pitch that is drawn, also when x and y differ', () => {
    const o = j({ ...checker, type: 'Symmetric circles', rows: 7, cols: 12, square: 20, circleSpacingX: 22, circleSpacingY: 18, circleDiameter: 12 });
    expect(o).toMatchObject({ square_mm: 22, spacing_y_mm: 18, circle_diameter_mm: 12, opencv_pattern_size: [12, 7] });
    expect(o).not.toHaveProperty('dictionary');
  });
});

describe('kalibrSupported', () => {
  it('AprilGrid only as Kalibr can detect it: tag36h11 with a two-bit border', () => {
    expect(kalibrSupported({ ...aprilgrid })).toBe(true);
    expect(kalibrSupported({ ...aprilgrid, aprilFamily: '36h11', borderBits: 2 })).toBe(true);
    expect(kalibrSupported({ ...aprilgrid, aprilFamily: '25h9' })).toBe(false);
    expect(kalibrSupported({ ...aprilgrid, borderBits: 1 })).toBe(false);
  });
});

describe('halconCode', () => {
  const tuple = (code: string, name: string) => {
    const m = code.match(new RegExp(`^${name} := \\[([\\s\\S]*?)\\]`, 'm'));
    return m ? m[1].split(',').map((v) => parseFloat(v)) : [];
  };

  it('only supports checkerboard and ChArUco', () => {
    expect(halconSupported(checker)).toBe(true);
    expect(halconSupported(charuco)).toBe(true);
    expect(halconSupported({ ...checker, type: 'HALCON-style dots' })).toBe(false);
    expect(() => halconCode({ ...checker, type: 'Symmetric circles' })).toThrow();
  });

  it('X/Y tuples are the inner corners in meters, innerCorners() order', () => {
    const code = halconCode(charuco);
    const X = tuple(code, 'X');
    const Y = tuple(code, 'Y');
    const ref = innerCorners(7, 10, 25);
    expect(X).toHaveLength(54);
    expect(Y).toHaveLength(54);
    ref.forEach(([x, y], i) => {
      expect(X[i]).toBeCloseTo(x / 1000, 9);
      expect(Y[i]).toBeCloseTo(y / 1000, 9);
    });
  });

  it('uses the point-tuple form of set_calib_data_calib_object', () => {
    const code = halconCode(checker);
    expect(code).toContain("create_calib_data ('calibration_object', 1, 1, CalibDataID)");
    expect(code).toContain('set_calib_data_calib_object (CalibDataID, 0, [X, Y, Z])');
    expect(code).toContain('tuple_gen_const (|X|, 0.0, Z)');
  });
});

describe('config brand headers', () => {
  it('kalibrYaml has 3-line brand header at top', () => {
    const y = kalibrYaml(checker);
    const lines = y.split('\n');
    expect(lines[0]).toMatch(/^# Checkerboard/);
    expect(lines[1]).toMatch(/^# Generated with calib\.tools\/tools\/generator/);
    expect(lines[2]).toBe('#');
  });

  it('kalibrYaml still parses (data lines present)', () => {
    const y = kalibrYaml(checker);
    const dataLines = y.split('\n').filter(l => !l.startsWith('#') && l.trim());
    expect(dataLines.some(l => l.startsWith("target_type:"))).toBe(true);
  });

  it('ros2Yaml has 3-line brand header at top', () => {
    const y = ros2Yaml(checker);
    const lines = y.split('\n');
    expect(lines[0]).toMatch(/^# Checkerboard/);
    expect(lines[1]).toMatch(/^# Generated with calib\.tools/);
  });

  it('ros2Yaml still parses', () => {
    const y = ros2Yaml(checker);
    const dataLines = y.split('\n').filter(l => !l.startsWith('#') && l.trim());
    expect(dataLines.some(l => l.includes('square_size:'))).toBe(true);
  });

  it('halconCode has a brand header in HDevelop comments', () => {
    const lines = halconCode(checker).split('\n');
    expect(lines[0]).toMatch(/^\* Checkerboard/);
    expect(lines[1]).toMatch(/^\* Generated with calib\.tools/);
  });
});

describe('opencvJson', () => {
  it('has _generator object', () => {
    const j = JSON.parse(opencvJson(charuco));
    expect(j._generator).toBeDefined();
    expect(j._generator.name).toBe('Calib.Tools');
    expect(j._generator.url).toBe('https://calib.tools');
    expect(j._generator.generated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(j._generator.pattern).toContain('ChArUco');
  });

  it('still has pattern fields', () => {
    const j = JSON.parse(opencvJson(charuco));
    expect(j.pattern).toBe('ChArUco');
    expect(j.rows).toBe(7);
    expect(j.cols).toBe(10);
    expect(j.square_mm).toBe(25);
  });
});

describe('id_range in configs', () => {
  it('opencvJson includes id_range for ChArUco', () => {
    const j = JSON.parse(opencvJson(charuco));
    expect(j.id_range).toEqual([0, 34]);
  });

  it('opencvJson omits id_range for Checkerboard', () => {
    const j = JSON.parse(opencvJson(checker));
    expect(j.id_range).toBeUndefined();
  });

  it('kalibrYaml includes id range comment for AprilGrid', () => {
    const y = kalibrYaml(aprilgrid);
    expect(y).toContain('# id_range: 0-');
  });

  it('ros2Yaml includes id_range for ChArUco', () => {
    const y = ros2Yaml(charuco);
    expect(y).toContain('id_range');
  });

  it('halconCode explains the ChArUco corner order', () => {
    expect(halconCode(charuco)).toContain('ChArUco corner IDs');
  });
});

describe('opencvJson legacy_pattern', () => {
  it('sets legacy_pattern for ChArUco with the legacy layout', () => {
    expect(JSON.parse(opencvJson({ ...charuco, legacyLayout: true })).legacy_pattern).toBe(true);
  });
  it('omits legacy_pattern otherwise', () => {
    expect(JSON.parse(opencvJson(charuco)).legacy_pattern).toBeUndefined();
    expect(JSON.parse(opencvJson({ ...checker, legacyLayout: true })).legacy_pattern).toBeUndefined();
  });
});

describe('opencvJson checkerboard flags', () => {
  it('includes marker:true when finderMarkers is set', () => {
    const spec: PatternSpec = { ...checker, finderMarkers: true };
    const j = JSON.parse(opencvJson(spec));
    expect(j.marker).toBe(true);
  });

  it('includes radon:true when radonCheckers is set', () => {
    const spec: PatternSpec = { ...checker, radonCheckers: true };
    const j = JSON.parse(opencvJson(spec));
    expect(j.radon).toBe(true);
  });

  it('omits marker/radon/inverted keys when not set', () => {
    const j = JSON.parse(opencvJson(checker));
    expect(j.marker).toBeUndefined();
    expect(j.radon).toBeUndefined();
    expect(j.inverted).toBeUndefined();
  });
});

describe('opencvJson for circle grids', () => {
  const base = { type: 'Symmetric circles', rows: 10, cols: 14, square: 25, marker: 0, dict: '', paper: 'A3', startId: 0, scaleBar: false, circleDiameter: 17 } as const;
  it('gives the findCirclesGrid pattern size and flag for a symmetric grid', () => {
    const j = JSON.parse(opencvJson({ ...base }));
    expect(j.opencv_pattern_size).toEqual([14, 10]);
    expect(j.opencv_flag).toBe('CALIB_CB_SYMMETRIC_GRID');
    expect(j.circle_diameter_mm).toBe(17);
  });
  it('halves the columns for an asymmetric grid, which fills every other lattice position', () => {
    const j = JSON.parse(opencvJson({ ...base, type: 'Asymmetric circles', rows: 9 }));
    expect(j.opencv_pattern_size).toEqual([7, 9]);
    expect(j.opencv_flag).toBe('CALIB_CB_ASYMMETRIC_GRID');
  });
  it('gives no pattern size for an asymmetric lattice with an odd number of columns', () => {
    expect(JSON.parse(opencvJson({ ...base, type: 'Asymmetric circles', cols: 13 })).opencv_pattern_size).toBeUndefined();
  });
});

