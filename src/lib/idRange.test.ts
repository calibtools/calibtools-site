import { describe, it, expect } from 'vitest';
import { idRange } from './idRange';
import type { PatternSpec } from './patterns';

const base: PatternSpec = {
  type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

describe('idRange', () => {
  it('ChArUco 7x10 startId=0 → {min:0, max:34, count:35}', () => {
    expect(idRange(base)).toEqual({ min: 0, max: 34, count: 35 });
  });

  it('ChArUco 7x10 startId=10 → {min:10, max:44, count:35}', () => {
    expect(idRange({ ...base, startId: 10 })).toEqual({ min: 10, max: 44, count: 35 });
  });

  it('AprilGrid 6x6 startId=0 → {min:0, max:35, count:36}', () => {
    expect(idRange({ ...base, type: 'AprilGrid (Kalibr)', rows: 6, cols: 6 })).toEqual({ min: 0, max: 35, count: 36 });
  });

  it('AprilGrid 4x5 startId=100 → {min:100, max:119, count:20}', () => {
    expect(idRange({ ...base, type: 'AprilGrid (Kalibr)', rows: 4, cols: 5, startId: 100 })).toEqual({ min: 100, max: 119, count: 20 });
  });

  it('Checkerboard returns null', () => {
    expect(idRange({ ...base, type: 'Checkerboard' })).toBeNull();
  });

  it('Symmetric circles returns null', () => {
    expect(idRange({ ...base, type: 'Symmetric circles' })).toBeNull();
  });

  it('ArUco grid 5x8 startId=0 → {min:0, max:19, count:20}', () => {
    expect(idRange({ ...base, type: 'ArUco grid', rows: 5, cols: 8 })).toEqual({ min: 0, max: 19, count: 20 });
  });

  it('Marker sheet 2x3 startId=5 → {min:5, max:10, count:6}', () => {
    expect(idRange({ ...base, type: 'Marker sheet' as any, rows: 2, cols: 3, startId: 5 })).toEqual({ min: 5, max: 10, count: 6 });
  });
});
