/**
 * What the product page and the datasheet say about the margin and the marking of a ChArUco board
 * has to hold for every stock size and for what the print file carries.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMPOSITE_SIZES } from './boardSizes';
import { factoryScaleBar } from './factoryStrip';
import { dictMarkerCount } from './dicts/dicts';

const ROOT = resolve(__dirname, '../..');
const page = readFileSync(resolve(ROOT, 'src/content/products/charuco-composite.md'), 'utf-8');
const sheet = readFileSync(resolve(ROOT, 'docs/datasheets/CT-DS-CHA-P.md'), 'utf-8');

const boards = COMPOSITE_SIZES.map((g) => {
  const [boardW, boardH] = g.label.split(' × ').map(Number);
  return { ...g, boardW, boardH, ox: (boardW - g.cols * g.square) / 2, oy: (boardH - g.rows * g.square) / 2 };
});

describe('ChArUco composite: margin', () => {
  it('every stock size has at least half a square of white on every side, and none has a full square on all sides', () => {
    for (const b of boards) {
      expect(Math.min(b.ox, b.oy), b.label).toBeGreaterThanOrEqual(b.square / 2);
    }
    expect(boards.some((b) => Math.min(b.ox, b.oy) < b.square)).toBe(true);
  });

  it('the product page and the datasheet state half a square, not a full one', () => {
    expect(page.includes('at least half a square on every side'), 'at least half a square on every side').toBe(true);
    expect(sheet.includes('white margin ≥ ½ square on all sides'), 'white margin ≥ ½ square on all sides').toBe(true);
    for (const text of [page, sheet]) {
      expect(/at least one square|≥ 1 square/.test(text)).toBe(false);
      expect(/quiet zone/i.test(text)).toBe(false);
    }
  });
});

describe('ChArUco composite: marking', () => {
  it('names the label line under the pattern and the 100 mm scale bar above it', () => {
    expect(page.includes('a label line under the pattern'), 'a label line under the pattern').toBe(true);
    expect(page.includes('100 mm scale bar above it'), '100 mm scale bar above it').toBe(true);
    expect(sheet.includes('label line under the pattern'), 'label line under the pattern').toBe(true);
    expect(sheet.includes('100 mm scale bar above it'), '100 mm scale bar above it').toBe(true);
    // the bar is above the pattern on every size
    for (const b of boards) expect(factoryScaleBar(b).y, b.label).toBeLessThan(b.oy);
  });

  it('does not promise an ID range on the label, which carries grid, square, marker and dictionary', () => {
    expect(/ID range (is|are) printed|and ID range are printed/.test(page)).toBe(false);
    expect(page.includes('Grid size, square size, marker size and dictionary are printed'), 'Grid size, square size, marker size and dictionary are printed').toBe(true);
  });
});

describe('ChArUco composite: DICT_4X4_50', () => {
  it('is offered only where the grid fits its 50 markers, and both texts say so', () => {
    const fits = boards.filter((b) => Math.floor((b.rows * b.cols) / 2) <= dictMarkerCount('DICT_4X4_50')!).map((b) => b.label);
    expect(fits).toEqual(['200 × 150', '300 × 200']);
    expect(page.includes('D4 is offered on the 200 × 150 and 300 × 200 mm boards'), 'D4 is offered on the 200 × 150 and 300 × 200 mm boards').toBe(true);
    expect(sheet.includes('200 × 150 and 300 × 200 mm only'), '200 × 150 and 300 × 200 mm only').toBe(true);
  });
});
