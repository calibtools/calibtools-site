import { describe, it, expect } from 'vitest';
import { puzzleGrid, decodePuzzleOffset, renderPuzzleBoardSvg } from './renderPuzzleBoard';
import type { PatternSpec } from './patterns';

describe('puzzleGrid', () => {
  it('returns correct dimensions', () => {
    const grid = puzzleGrid(5, 8, 0, 0);
    expect(grid).toHaveLength(5);
    expect(grid[0]).toHaveLength(8);
  });

  it('all cells are 0 or 1', () => {
    const grid = puzzleGrid(6, 6, 0, 0);
    for (const row of grid) {
      for (const cell of row) {
        expect(cell === 0 || cell === 1).toBe(true);
      }
    }
  });

  it('different offsets produce different patterns', () => {
    const g1 = puzzleGrid(5, 5, 0, 0);
    const g2 = puzzleGrid(5, 5, 3, 2);
    const flat1 = g1.flat().join('');
    const flat2 = g2.flat().join('');
    expect(flat1).not.toBe(flat2);
  });
});

describe('decodePuzzleOffset (self-test)', () => {
  it('decodes offset (0,0)', () => {
    const grid = puzzleGrid(5, 5, 0, 0);
    const decoded = decodePuzzleOffset(grid, 20, 20);
    expect(decoded).toEqual({ x: 0, y: 0 });
  });

  it('decodes offset (3,2)', () => {
    const grid = puzzleGrid(5, 5, 3, 2);
    const decoded = decodePuzzleOffset(grid, 20, 20);
    expect(decoded).toEqual({ x: 3, y: 2 });
  });

  it('decodes offset (7,5) for larger grid', () => {
    const grid = puzzleGrid(6, 8, 7, 5);
    const decoded = decodePuzzleOffset(grid, 20, 20);
    expect(decoded).toEqual({ x: 7, y: 5 });
  });

  it('uniquely identifies various offsets', () => {
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [5, 3], [10, 7]] as [number, number][]) {
      const grid = puzzleGrid(5, 5, ox, oy);
      const decoded = decodePuzzleOffset(grid, 15, 15);
      expect(decoded).toEqual({ x: ox, y: oy });
    }
  });
});

describe('renderPuzzleBoardSvg', () => {
  const base: PatternSpec = {
    type: 'PuzzleBoard',
    rows: 6, cols: 8, square: 25, marker: 0,
    dict: '', paper: 'A4', startId: 0, scaleBar: false,
    puzzleOffsetX: 0, puzzleOffsetY: 0,
  };

  it('renders black rects for filled cells', () => {
    const svg = renderPuzzleBoardSvg(base, 20, 20);
    const rects = svg.match(/<rect/g);
    expect(rects).not.toBeNull();
    expect(rects!.length).toBeGreaterThan(0);
    // Should be less than total cells (not all black)
    expect(rects!.length).toBeLessThan(base.rows * base.cols);
  });

  it('different offsets produce different SVG', () => {
    const svg1 = renderPuzzleBoardSvg(base, 20, 20);
    const svg2 = renderPuzzleBoardSvg({ ...base, puzzleOffsetX: 5, puzzleOffsetY: 3 }, 20, 20);
    expect(svg1).not.toBe(svg2);
  });
});
