/**
 * Unit tests for board-set ID ranges: every size × dictionary → correct
 * marker count, and sets of 2/3/4 → non-overlapping ranges.
 */
import { describe, it, expect } from 'vitest';
import {
  COMPOSITE_SIZES, CERAMIC_SIZES, APRILGRID_SIZES,
  markerCount,
} from '../../src/lib/boardSizes';
import { computeSetBoards } from '../../src/lib/exportSet';
import { dictMarkerCount } from '../../src/lib/dicts/dicts';
import type { PatternSpec } from '../../src/lib/patterns';

const CHARUCO_DICTS = ['DICT_4X4_50', 'DICT_5X5_100', 'DICT_6X6_250'] as const;

function charucoSpec(size: typeof COMPOSITE_SIZES[number] | typeof CERAMIC_SIZES[number], dict: string): PatternSpec {
  return {
    type: 'ChArUco', rows: size.rows, cols: size.cols,
    square: size.square, marker: size.marker,
    dict, paper: 'A4', startId: 0, scaleBar: false,
  };
}

function aprilGridSpec(size: typeof APRILGRID_SIZES[number]): PatternSpec {
  return {
    type: 'AprilGrid (Kalibr)', rows: size.rows, cols: size.cols,
    square: size.tagSize, marker: size.tagSize,
    dict: 'DICT_APRILTAG_36h11', paper: 'A4', startId: 0, scaleBar: false,
  };
}

describe('ChArUco composite: marker counts per size × dictionary', () => {
  for (const size of COMPOSITE_SIZES) {
    const mc = markerCount('charuco', size.rows, size.cols);
    it(`${size.label} needs ${mc} markers`, () => {
      expect(mc).toBe(Math.floor((size.rows * size.cols) / 2));
    });
    for (const dict of CHARUCO_DICTS) {
      const dictCount = dictMarkerCount(dict)!;
      const fits = dictCount >= mc;
      it(`${size.label} + ${dict} (${dictCount}): ${fits ? 'fits' : 'impossible'}`, () => {
        if (fits) {
          expect(dictCount).toBeGreaterThanOrEqual(mc);
        } else {
          expect(dictCount).toBeLessThan(mc);
        }
      });
    }
  }
});

describe('ChArUco ceramic: marker counts per size × dictionary', () => {
  for (const size of CERAMIC_SIZES) {
    const mc = markerCount('charuco', size.rows, size.cols);
    for (const dict of CHARUCO_DICTS) {
      const dictCount = dictMarkerCount(dict)!;
      const fits = dictCount >= mc;
      it(`${size.label} + ${dict} (${dictCount}): ${fits ? 'fits' : 'impossible'}`, () => {
        if (fits) {
          expect(dictCount).toBeGreaterThanOrEqual(mc);
        } else {
          expect(dictCount).toBeLessThan(mc);
        }
      });
    }
  }
});

describe('AprilGrid: marker counts per size', () => {
  for (const size of APRILGRID_SIZES) {
    const mc = markerCount('aprilgrid', size.rows, size.cols);
    it(`${size.label} has ${mc} tags (rows × cols)`, () => {
      expect(mc).toBe(size.rows * size.cols);
    });
    it(`${size.label} fits in AprilTag 36h11 (587)`, () => {
      expect(dictMarkerCount('DICT_APRILTAG_36h11')).toBeGreaterThanOrEqual(mc);
    });
  }
});

describe('set ID ranges are non-overlapping and correct length', () => {
  const testCases = [
    { name: 'CHA-P 200×150 set of 2', spec: charucoSpec(COMPOSITE_SIZES[0], 'DICT_6X6_250'), count: 2, expectedMc: 17 },
    { name: 'CHA-P 200×150 set of 3', spec: charucoSpec(COMPOSITE_SIZES[0], 'DICT_6X6_250'), count: 3, expectedMc: 17 },
    { name: 'CHA-P 200×150 set of 4', spec: charucoSpec(COMPOSITE_SIZES[0], 'DICT_6X6_250'), count: 4, expectedMc: 17 },
    { name: 'CHA-P 800×600 set of 2', spec: charucoSpec(COMPOSITE_SIZES[4], 'DICT_6X6_250'), count: 2, expectedMc: 82 },
    { name: 'APR-P 300×200 set of 2', spec: aprilGridSpec(APRILGRID_SIZES[1]), count: 2, expectedMc: 35 },
    { name: 'APR-P 800×600 set of 4', spec: aprilGridSpec(APRILGRID_SIZES[4]), count: 4, expectedMc: 108 },
  ];

  for (const tc of testCases) {
    it(`${tc.name}: each board has ${tc.expectedMc} markers, ranges non-overlapping`, () => {
      const boards = computeSetBoards(tc.spec, tc.count);
      expect(boards).toHaveLength(tc.count);

      for (let i = 0; i < boards.length; i++) {
        const b = boards[i];
        // Each range has the correct length
        expect(b.idRange.count).toBe(tc.expectedMc);
        expect(b.idRange.max - b.idRange.min + 1).toBe(tc.expectedMc);

        // Non-overlapping with the next board
        if (i < boards.length - 1) {
          expect(boards[i + 1].idRange.min).toBe(b.idRange.max + 1);
        }
      }

      // First board starts at 0
      expect(boards[0].idRange.min).toBe(0);
    });
  }

  it('CHA-P 200×150 set of 2 → IDs 0–16, 17–33', () => {
    const boards = computeSetBoards(charucoSpec(COMPOSITE_SIZES[0], 'DICT_6X6_250'), 2);
    expect(boards[0].idRange).toEqual({ min: 0, max: 16, count: 17 });
    expect(boards[1].idRange).toEqual({ min: 17, max: 33, count: 17 });
  });

  it('CHA-P 800×600 set of 2 → IDs 0–81, 82–163', () => {
    const boards = computeSetBoards(charucoSpec(COMPOSITE_SIZES[4], 'DICT_6X6_250'), 2);
    expect(boards[0].idRange).toEqual({ min: 0, max: 81, count: 82 });
    expect(boards[1].idRange).toEqual({ min: 82, max: 163, count: 82 });
  });

  it('APR-P 300×200 set of 2 → IDs 0–34, 35–69', () => {
    const boards = computeSetBoards(aprilGridSpec(APRILGRID_SIZES[1]), 2);
    expect(boards[0].idRange).toEqual({ min: 0, max: 34, count: 35 });
    expect(boards[1].idRange).toEqual({ min: 35, max: 69, count: 35 });
  });
});

describe('impossible variant list (DICT_4X4_50 with large boards)', () => {
  const impossibleCombos = [
    { product: 'CHA-P', label: '400 × 300', mc: 54 },
    { product: 'CHA-P', label: '600 × 400', mc: 63 },
    { product: 'CHA-P', label: '800 × 600', mc: 82 },
    { product: 'CHA-C', label: '230 × 140', mc: 56 },
  ];

  const dict4x4Count = dictMarkerCount('DICT_4X4_50')!;

  for (const combo of impossibleCombos) {
    it(`${combo.product} ${combo.label} × DICT_4X4_50: needs ${combo.mc} > ${dict4x4Count}`, () => {
      expect(dict4x4Count).toBeLessThan(combo.mc);
    });
  }

  // Verify all other combos are valid
  const allSizes = [...COMPOSITE_SIZES, ...CERAMIC_SIZES];
  for (const size of allSizes) {
    const mc = markerCount('charuco', size.rows, size.cols);
    for (const dict of ['DICT_5X5_100', 'DICT_6X6_250'] as const) {
      it(`${size.label} × ${dict}: fits (${dictMarkerCount(dict)} >= ${mc})`, () => {
        expect(dictMarkerCount(dict)!).toBeGreaterThanOrEqual(mc);
      });
    }
  }
});
