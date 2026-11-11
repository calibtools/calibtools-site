import { describe, it, expect } from 'vitest';
import { patternRows } from './patternRows';
import { GENERATOR_DEFAULT } from './patternLink';

describe('patternRows', () => {
  it('lists squares, marker, dictionary and first ID for ChArUco', () => {
    expect(patternRows({ ...GENERATOR_DEFAULT, type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18, dict: 'DICT_5X5_100', startId: 35 })).toEqual([
      ['Pattern', 'ChArUco'], ['Squares', '7 × 10'], ['Square size', '25 mm'], ['Marker size', '18 mm'], ['Dictionary', 'DICT_5X5_100'], ['First ID', '35'],
    ]);
  });
  it('leaves marker fields out for a checkerboard', () => {
    expect(patternRows({ ...GENERATOR_DEFAULT, type: 'Checkerboard', rows: 7, cols: 10, square: 25 })).toEqual([['Pattern', 'Checkerboard'], ['Squares', '7 × 10'], ['Square size', '25 mm']]);
  });
  it('gives tag size, gap and ID range for an AprilGrid', () => {
    expect(patternRows({ ...GENERATOR_DEFAULT, type: 'AprilGrid (Kalibr)', rows: 4, cols: 6, square: 25, tagSpacing: 0.3, startId: 0 })).toEqual([
      ['Pattern', 'AprilGrid (Kalibr)'], ['Tags', '4 × 6'], ['Tag size', '25 mm'], ['Gap', '7.5 mm'], ['Family', 'AprilTag 36h11'], ['IDs', '0–23'],
    ]);
  });
  it('gives spacing and diameter for circle grids', () => {
    expect(patternRows({ ...GENERATOR_DEFAULT, type: 'Symmetric circles', rows: 7, cols: 10, square: 20, circleDiameter: 12 })).toEqual([
      ['Pattern', 'Symmetric circles'], ['Circles', '7 × 10'], ['Spacing', '20 mm'], ['Diameter', '12 mm'],
    ]);
  });
});
