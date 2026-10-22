import { describe, it, expect } from 'vitest';
import { kalibrYaml, ros2Yaml, halconDescr } from './exportConfig';
import type { PatternSpec } from './patterns';

const checker: PatternSpec = {
  type: 'Checkerboard', rows: 7, cols: 10, square: 25, marker: 18,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

const charuco: PatternSpec = { ...checker, type: 'ChArUco' };
const aprilgrid: PatternSpec = { ...checker, type: 'AprilGrid (Kalibr)' };

describe('kalibrYaml', () => {
  it('checkerboard uses target_type checkerboard', () => {
    const y = kalibrYaml(checker);
    expect(y).toContain("target_type: 'checkerboard'");
    expect(y).toContain('targetRows: 7');
    expect(y).toContain('targetCols: 10');
    expect(y).toContain('rowSpacingMeters: 0.025000');
  });

  it('aprilgrid uses target_type aprilgrid with tagSpacing', () => {
    const y = kalibrYaml(aprilgrid);
    expect(y).toContain("target_type: 'aprilgrid'");
    expect(y).toContain('tagRows: 7');
    expect(y).toContain(`tagSpacing: ${(18 / 25).toFixed(6)}`);
  });

  it('contains generator attribution', () => {
    expect(kalibrYaml(checker)).toContain('calib.tools');
  });
});

describe('ros2Yaml', () => {
  it('uses inner corner count (rows-1 x cols-1)', () => {
    const y = ros2Yaml(checker);
    expect(y).toContain('rows: 6');
    expect(y).toContain('cols: 9');
  });

  it('includes CLI usage comment', () => {
    const y = ros2Yaml(checker);
    expect(y).toContain('--size 9x6');
    expect(y).toContain('--square 0.0250');
  });

  it('adds marker fields for ChArUco', () => {
    const y = ros2Yaml(charuco);
    expect(y).toContain('marker_size: 0.018000');
    expect(y).toContain('dictionary: DICT_6X6_250');
    expect(y).toContain('type: charuco');
  });

  it('square_size is in metres', () => {
    const y = ros2Yaml(checker);
    expect(y).toContain('square_size: 0.025000');
  });
});

describe('halconDescr', () => {
  it('has correct mark counts (inner corners)', () => {
    const d = halconDescr(checker);
    expect(d).toContain('x_marks 9');
    expect(d).toContain('y_marks 6');
  });

  it('cell dimensions in metres', () => {
    const d = halconDescr(checker);
    expect(d).toContain('cell_width  0.025000');
    expect(d).toContain('cell_height 0.025000');
  });

  it('plate size is full board in metres', () => {
    const d = halconDescr(checker);
    expect(d).toContain('plate_width  0.250000');
    expect(d).toContain('plate_height 0.175000');
  });

  it('lists all inner corner positions', () => {
    const d = halconDescr(checker);
    // 6 rows × 9 cols = 54 inner corners
    const posLines = d.split('\n').filter((l) => /^\d+ \d+$/.test(l));
    expect(posLines).toHaveLength(54);
    expect(posLines[0]).toBe('0 0');
    expect(posLines[posLines.length - 1]).toBe('5 8');
  });
});
