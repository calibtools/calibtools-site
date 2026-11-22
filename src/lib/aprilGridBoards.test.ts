/**
 * AprilGrid stock boards: the grid has to leave white around it on the board. The 600 × 400 board once
 * carried 7 rows, 396 mm of tags on a 400 mm board, 2 mm from each edge.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATALOG, specFromEntry } from './catalogPatterns';
import { APRILGRID_SIZES } from './boardSizes';
import { GENERATOR_DEFAULT } from './patternLink';
import { patternFrame } from './boardDrawing';
import type { PatternSpec } from './patterns';

const ROOT = resolve(__dirname, '../..');
const sheet = readFileSync(resolve(ROOT, 'docs/datasheets/CT-DS-APR-P.md'), 'utf-8');
const page = readFileSync(resolve(ROOT, 'src/content/products/aprilgrid-composite.md'), 'utf-8');

const boards = CATALOG.filter((e) => e.handle === 'aprilgrid-composite').map((e) => {
  const m = /-(\d+)X(\d+)-/.exec(e.partNumber)!;
  const spec = { ...GENERATOR_DEFAULT, ...specFromEntry(e) } as PatternSpec;
  const f = patternFrame(spec);
  const W = Number(m[1]), H = Number(m[2]);
  return { pn: e.partNumber, W, H, spec, mx: (W - f.box.w) / 2, my: (H - f.box.h) / 2 };
});

describe('AprilGrid stock boards', () => {
  it('there are five, and each leaves at least 6 mm of white on every side', () => {
    expect(boards.length).toBe(5);
    for (const b of boards) expect(Math.min(b.mx, b.my), b.pn).toBeGreaterThanOrEqual(6);
  });

  it('the 600 × 400 board is 6 × 10 tags of 45 mm: 31.25 mm above and below, 14.25 mm left and right', () => {
    const b = boards.find((x) => x.pn === 'CT-APR-P-600X400-T36')!;
    expect([b.spec.rows, b.spec.cols, b.spec.square]).toEqual([6, 10, 45]);
    expect(b.my).toBeCloseTo(31.25, 6);
    expect(b.mx).toBeCloseTo(14.25, 6);
  });

  it('catalog, size list, datasheet and product page give the same grid for every size', () => {
    for (const b of boards) {
      const size = APRILGRID_SIZES.find((s) => s.label === `${b.W} × ${b.H}`)!;
      expect([size.rows, size.cols, size.tagSize], b.pn).toEqual([b.spec.rows, b.spec.cols, b.spec.square]);
      const tags = b.spec.rows * b.spec.cols;
      const row = `| ${b.pn} | ${b.W} × ${b.H} mm | ${b.spec.rows} × ${b.spec.cols} | ${b.spec.square} / ${size.gap} mm | ${tags} |`;
      expect(sheet.includes(row), row).toBe(true);
      const title = `AprilGrid ${b.spec.rows} × ${b.spec.cols}, ${b.spec.square} mm tags, ${size.gap} mm gap, ${b.W} × ${b.H} mm, ${tags} tags`;
      expect(page.includes(title), title).toBe(true);
    }
  });
});
