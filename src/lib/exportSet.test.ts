import { describe, it, expect } from 'vitest';
import { computeSetBoards, buildSetManifest, setBoardFilename } from './exportSet';
import type { PatternSpec } from './patterns';

const base: PatternSpec = {
  type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

describe('computeSetBoards', () => {
  it('3 boards → IDs 0-34, 35-69, 70-104', () => {
    const boards = computeSetBoards(base, 3);
    expect(boards).toHaveLength(3);
    expect(boards[0].startId).toBe(0);
    expect(boards[0].idRange).toEqual({ min: 0, max: 34, count: 35 });
    expect(boards[1].startId).toBe(35);
    expect(boards[1].idRange).toEqual({ min: 35, max: 69, count: 35 });
    expect(boards[2].startId).toBe(70);
    expect(boards[2].idRange).toEqual({ min: 70, max: 104, count: 35 });
  });

  it('respects per-board override', () => {
    const boards = computeSetBoards(base, 2, [0, 100]);
    expect(boards[0].startId).toBe(0);
    expect(boards[1].startId).toBe(100);
    expect(boards[1].idRange).toEqual({ min: 100, max: 134, count: 35 });
  });

  it('returns empty for Checkerboard', () => {
    expect(computeSetBoards({ ...base, type: 'Checkerboard' }, 3)).toEqual([]);
  });

  it('AprilGrid 4x5 → 20 tags per board', () => {
    const boards = computeSetBoards({ ...base, type: 'AprilGrid (Kalibr)', rows: 4, cols: 5 }, 2);
    expect(boards[0].idRange.count).toBe(20);
    expect(boards[1].startId).toBe(20);
  });
});

describe('buildSetManifest', () => {
  it('produces valid JSON with board entries', () => {
    const boards = computeSetBoards(base, 2);
    const manifest = buildSetManifest(base, boards);
    const parsed = JSON.parse(manifest);
    expect(parsed.boards).toHaveLength(2);
    expect(parsed.boards[0].start_id).toBe(0);
    expect(parsed.boards[0].id_range).toEqual([0, 34]);
    expect(parsed.boards[1].start_id).toBe(35);
    expect(parsed.board_count).toBe(2);
    expect(parsed.pattern).toBe('ChArUco');
  });
});

describe('setBoardFilename', () => {
  it('includes start ID in filename', () => {
    expect(setBoardFilename(base, 35)).toContain('id35');
    expect(setBoardFilename(base, 35)).toMatch(/\.pdf$/);
  });
});
