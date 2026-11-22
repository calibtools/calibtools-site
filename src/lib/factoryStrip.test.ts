/** The 100 mm scale bar printed on the boards: exactly 100 mm, on the board, clear of the pattern and of the edge. */
import { describe, it, expect } from 'vitest';
import { factoryScaleBar, factoryScaleBarRect, SCALE_BAR_MM } from './factoryStrip';
import { COMPOSITE_SIZES } from './boardSizes';

const boards = COMPOSITE_SIZES.map((g) => {
  const [boardW, boardH] = g.label.split(' × ').map(Number);
  const patW = g.cols * g.square, patH = g.rows * g.square;
  return { label: g.label, boardW, boardH, ox: (boardW - patW) / 2, oy: (boardH - patH) / 2, patW, patH };
});

describe('factoryScaleBar', () => {
  it('covers the five composite sizes', () => {
    expect(boards.map((b) => b.label)).toEqual(['200 × 150', '300 × 200', '400 × 300', '600 × 400', '800 × 600']);
  });

  it.each(boards)('$label: 100 mm long, in the top margin, clear of the pattern and of the board edge', (b) => {
    const bar = factoryScaleBar(b);
    expect(SCALE_BAR_MM).toBe(100);
    expect(bar.width).toBe(100);
    // starts at the left edge of the pattern, so it lines up with the label line under the pattern
    expect(bar.x).toBe(b.ox);
    expect(bar.x + bar.width).toBeLessThanOrEqual(b.ox + b.patW);
    // vertically centered in the top margin
    expect(bar.y + bar.height / 2).toBeCloseTo(b.oy / 2, 6);
    expect(bar.height).toBeGreaterThanOrEqual(0.5);
    expect(bar.height).toBeLessThanOrEqual(1.2);
    // at least 5 mm of white to the pattern and to the board edge
    expect(b.oy - (bar.y + bar.height)).toBeGreaterThanOrEqual(5);
    expect(bar.y).toBeGreaterThanOrEqual(5);
    // caption right of the bar, on the board, level with it
    expect(bar.caption.text).toBe('100 mm');
    expect(bar.caption.x).toBeGreaterThan(bar.x + bar.width);
    expect(bar.caption.x + bar.caption.size * 6 * 0.62).toBeLessThan(b.boardW - b.ox);
    expect(bar.caption.baseline).toBeGreaterThan(bar.y);
    expect(bar.caption.baseline).toBeLessThan(b.oy - 5);
  });

  it('draws the bar as one black rectangle of exactly 100 mm', () => {
    const b = boards[2];
    const svg = factoryScaleBarRect(factoryScaleBar(b));
    const m = /^<rect id="scale-bar" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="#000000"\/>$/.exec(svg)!;
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBe(b.ox);
    expect(Number(m[3])).toBe(100);
  });
});
