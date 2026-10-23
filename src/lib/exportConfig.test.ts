import { describe, it, expect } from 'vitest';
import { kalibrYaml, ros2Yaml, halconDescr, opencvJson } from './exportConfig';
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
    expect(kalibrYaml(checker)).toContain('Calib.Tools');
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

describe('config brand headers', () => {
  it('kalibrYaml has 3-line brand header at top', () => {
    const y = kalibrYaml(checker);
    const lines = y.split('\n');
    expect(lines[0]).toMatch(/^# .+ · generated \d{4}-\d{2}-\d{2} · calib\.tools$/);
    expect(lines[1]).toMatch(/^# Patterns and files © Calib\.Tools/);
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
    expect(lines[0]).toMatch(/^# .+ · generated \d{4}-\d{2}-\d{2} · calib\.tools$/);
  });

  it('ros2Yaml still parses', () => {
    const y = ros2Yaml(checker);
    const dataLines = y.split('\n').filter(l => !l.startsWith('#') && l.trim());
    expect(dataLines.some(l => l.includes('square_size:'))).toBe(true);
  });

  it('halconDescr has 3-line brand header at top', () => {
    const d = halconDescr(checker);
    const lines = d.split('\n');
    expect(lines[0]).toMatch(/^# .+ · generated \d{4}-\d{2}-\d{2} · calib\.tools$/);
  });

  it('halconDescr still has all inner corner positions', () => {
    const d = halconDescr(checker);
    const posLines = d.split('\n').filter(l => /^\d+ \d+$/.test(l));
    expect(posLines).toHaveLength(54);
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

  it('halconDescr includes id range comment for ChArUco', () => {
    const d = halconDescr(charuco);
    expect(d).toContain('id_range');
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
