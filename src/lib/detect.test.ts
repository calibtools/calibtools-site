import { describe, it, expect } from 'vitest';
import { expectedCount } from './detect';
import type { PatternSpec } from './patterns';

const base: PatternSpec = {
  type: 'Checkerboard', rows: 7, cols: 10, square: 25, marker: 18,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

describe('expectedCount', () => {
  it('Checkerboard 7x10 → 54 inner corners', () => {
    expect(expectedCount(base)).toBe(54);
  });

  it('ChArUco 7x10 → 54 inner corners', () => {
    expect(expectedCount({ ...base, type: 'ChArUco' })).toBe(54);
  });

  it('ArUco grid 7x10 → 35 markers (half of 70 squares)', () => {
    expect(expectedCount({ ...base, type: 'ArUco grid' })).toBe(35);
  });

  it('AprilGrid 6x6 → 18 markers', () => {
    expect(expectedCount({ ...base, type: 'AprilGrid (Kalibr)', rows: 6, cols: 6 })).toBe(18);
  });

  it('Symmetric circles 7x10 → 70 centers', () => {
    expect(expectedCount({ ...base, type: 'Symmetric circles' })).toBe(70);
  });

  it('Asymmetric circles 4x11 → 44 centers', () => {
    expect(expectedCount({ ...base, type: 'Asymmetric circles', rows: 4, cols: 11 })).toBe(44);
  });

  it('HALCON-style dots 7x11 → 77 dots', () => {
    expect(expectedCount({ ...base, type: 'HALCON-style dots', rows: 7, cols: 11 })).toBe(77);
  });

  it('Checkerboard 9x6 → 40 inner corners', () => {
    expect(expectedCount({ ...base, rows: 9, cols: 6 })).toBe(40);
  });
});
