import { describe, it, expect } from 'vitest';
import { boardDrawingSvg, drawingForPartNumber, representativePartNumber, toScaleOutlines } from './boardDrawing';
import { ALL_CHARUCO_SIZES, COMPOSITE_SIZES, CERAMIC_SIZES } from './boardSizes';
import { CATALOG } from './catalogPatterns';

interface Dim { name: string; mm: number; len: number; label: string }

/** Read every dimension line back from the SVG: declared mm, drawn length and printed label. */
function dims(svg: string): Dim[] {
  const out: Dim[] = [];
  const re = /<g class="dim" data-dim="([a-z-]+)" data-mm="([0-9.]+)">(.*?)<\/g>/gs;
  for (const m of svg.matchAll(re)) {
    const line = /<line class="dim-line" x1="([0-9.-]+)" y1="([0-9.-]+)" x2="([0-9.-]+)" y2="([0-9.-]+)"/.exec(m[3])!;
    const [x1, y1, x2, y2] = line.slice(1).map(Number);
    const label = /<text[^>]*>([^<]*)<\/text>/.exec(m[3])![1];
    out.push({ name: m[1], mm: Number(m[2]), len: Math.hypot(x2 - x1, y2 - y1), label });
  }
  return out;
}
const byName = (svg: string) => Object.fromEntries(dims(svg).map((d) => [d.name, d]));

describe('boardDrawingSvg', () => {
  it('draws every stock ChArUco board with dimensions equal to boardSizes.ts and to the drawn lengths (≤ 0.01 mm)', () => {
    const entries = CATALOG.filter((e) => e.spec.type === 'ChArUco');
    expect(entries.length).toBe(28);
    for (const e of entries) {
      const svg = drawingForPartNumber(e.partNumber)!;
      expect(svg, e.partNumber).toBeTruthy();
      const d = byName(svg);
      const [w, h] = e.partNumber.split('-')[3].split('X').map(Number);
      const size = ALL_CHARUCO_SIZES.find((s) => s.label === `${w} × ${h}`)!;
      expect(size, e.partNumber).toBeTruthy();
      const want = { 'board-w': w, 'board-h': h, 'pattern-w': size.cols * size.square, 'pattern-h': size.rows * size.square };
      for (const [name, mm] of Object.entries(want)) {
        expect(d[name].mm, `${e.partNumber} ${name} data-mm`).toBeCloseTo(mm, 2);
        expect(Math.abs(d[name].len - mm), `${e.partNumber} ${name} drawn length`).toBeLessThanOrEqual(0.01);
      }
      expect(d['board-w'].label).toBe(String(w));
      expect(d['pattern-w'].label).toBe(`${size.cols * size.square} = ${size.cols} × ${size.square}`);
      expect(d['pattern-h'].label).toBe(`${size.rows * size.square} = ${size.rows} × ${size.square}`);
    }
  });

  it('uses mm as the user unit: the viewBox contains the whole board and the board outline has the board size', () => {
    const svg = drawingForPartNumber('CT-CHA-P-400X300-D5')!;
    const outline = /<rect class="board" x="0" y="0" width="([0-9.]+)" height="([0-9.]+)"/.exec(svg)!;
    expect([Number(outline[1]), Number(outline[2])]).toEqual([400, 300]);
    const vb = /viewBox="([0-9.-]+) ([0-9.-]+) ([0-9.]+) ([0-9.]+)"/.exec(svg)!.slice(1).map(Number);
    expect(vb[0]).toBeLessThan(0); expect(vb[1]).toBeLessThan(0);
    expect(vb[0] + vb[2]).toBeGreaterThan(400); expect(vb[1] + vb[3]).toBeGreaterThan(300);
  });

  it('draws the real pattern: black squares and marker bits come from the pattern renderer', () => {
    const svg = drawingForPartNumber('CT-CHA-P-400X300-D5')!;
    // 12 × 9 board: 54 black squares of 30 mm, pattern centered (margins 20 and 15 mm)
    const squares = [...svg.matchAll(/<rect x="([0-9.]+)" y="([0-9.]+)" width="30" height="30" fill="#141414"\/>/g)];
    expect(squares.length).toBe(54);
    expect(squares[0].slice(1, 3).map(Number)).toEqual([20, 15]);
    // 54 markers of 22 mm
    expect([...svg.matchAll(/width="22" height="22" fill="#141414"/g)].length).toBe(54);
    // A different dictionary gives a different drawing
    expect(drawingForPartNumber('CT-CHA-P-400X300-D6')).not.toBe(svg);
  });

  it('has one origin with X to the right in red and Y down in green, at the pattern origin', () => {
    const svg = drawingForPartNumber('CT-CHA-P-400X300-D5')!;
    expect([...svg.matchAll(/class="origin"/g)].length).toBe(1);
    const o = /<circle class="origin" cx="([0-9.]+)" cy="([0-9.]+)"/.exec(svg)!;
    expect([Number(o[1]), Number(o[2])]).toEqual([20, 15]);
    const x = /<line class="axis-x" x1="([0-9.]+)" y1="([0-9.]+)" x2="([0-9.]+)" y2="([0-9.]+)" stroke="#E60012"/.exec(svg)!.slice(1).map(Number);
    expect(x[2]).toBeGreaterThan(x[0]); expect(x[3]).toBe(x[1]);
    const y = /<line class="axis-y" x1="([0-9.]+)" y1="([0-9.]+)" x2="([0-9.]+)" y2="([0-9.]+)" stroke="#00A651"/.exec(svg)!.slice(1).map(Number);
    expect(y[3]).toBeGreaterThan(y[1]); expect(y[2]).toBe(y[0]);
  });

  it('has an accessible name and no shadow, gradient or filter', () => {
    const svg = drawingForPartNumber('CT-CHA-P-400X300-D5')!;
    expect(svg).toMatch(/role="img" aria-label="[^"]*CT-CHA-P-400X300-D5[^"]*400 × 300 mm/);
    expect(svg).not.toMatch(/gradient|filter|shadow/i);
  });

  it('returns nothing for a part number that is not a stock ChArUco board', () => {
    expect(drawingForPartNumber('CT-XXX-P-1X1')).toBeUndefined();
    expect(drawingForPartNumber('CT-ACC-M-FIX14')).toBeUndefined();
  });

  it('rejects a pattern that does not fit on the board', () => {
    expect(() => boardDrawingSvg({ boardW: 100, boardH: 100, label: 'x', spec: { type: 'ChArUco', rows: 9, cols: 12, square: 30, marker: 22, dict: 'DICT_5X5_100', paper: 'A4', startId: 0, scaleBar: false } })).toThrow(/does not fit/);
  });
});

describe('toScaleOutlines', () => {
  it('draws board outlines at one common scale, sizes from boardSizes.ts', () => {
    const o = toScaleOutlines(COMPOSITE_SIZES.filter((_, i) => i % 2 === 0).map((s) => s.label), 10);
    expect(o.caption).toBe('200 · 400 · 800 mm, 1:10');
    const rects = [...o.svg.matchAll(/<rect class="outline" [^>]*width="([0-9.]+)" height="([0-9.]+)" data-mm="([0-9]+)x([0-9]+)"/g)];
    expect(rects.map((r) => [Number(r[3]), Number(r[4])])).toEqual([[200, 150], [400, 300], [800, 600]]);
    for (const r of rects) {
      expect(Number(r[1]) * 10).toBeCloseTo(Number(r[3]), 5);
      expect(Number(r[2]) * 10).toBeCloseTo(Number(r[4]), 5);
    }
  });

  it('accepts only sizes that exist in the catalog', () => {
    expect(() => toScaleOutlines(['123 × 45'], 10)).toThrow(/not a stock size/);
    expect(toScaleOutlines(CERAMIC_SIZES.slice(0, 3).map((s) => s.label), 2.5).caption).toBe('110 · 150 · 185 mm, 1:2.5');
  });
});

describe('drawings for product cards', () => {
  it('draws stock checkerboards from the checkerboard renderer, with true dimensions', () => {
    const entries = CATALOG.filter((e) => e.spec.type === 'Checkerboard');
    expect(entries.length).toBe(10);
    for (const e of entries) {
      const svg = drawingForPartNumber(e.partNumber)!;
      const d = byName(svg);
      const [w, h] = e.partNumber.split('-')[3].split('X').map(Number);
      expect(d['board-w'].mm).toBe(w);
      expect(d['board-h'].mm).toBe(h);
      expect(d['pattern-w'].mm).toBeCloseTo(e.spec.cols * e.spec.square, 2);
      expect(Math.abs(d['pattern-w'].len - e.spec.cols * e.spec.square)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(d['pattern-h'].len - e.spec.rows * e.spec.square)).toBeLessThanOrEqual(0.01);
      const squares = [...svg.matchAll(new RegExp(`width="${e.spec.square}" height="${e.spec.square}" fill="#141414"`, 'g'))];
      expect(squares.length, e.partNumber).toBe(Math.ceil((e.spec.rows * e.spec.cols) / 2));
    }
  });

  it('compact drawing: same board and pattern, no dimension lines', () => {
    const full = drawingForPartNumber('CT-CHA-P-400X300-D6')!;
    const compact = drawingForPartNumber('CT-CHA-P-400X300-D6', { dimensions: false })!;
    expect(compact).not.toContain('class="dim"');
    expect(compact).toContain('class="origin"');
    expect(/<g class="pattern">.*?<\/g>/s.exec(compact)![0]).toBe(/<g class="pattern">.*?<\/g>/s.exec(full)![0]);
    expect(compact.length).toBeLessThan(full.length);
  });

  it('picks one representative stock board per product, and nothing for products we cannot draw', () => {
    expect(representativePartNumber('charuco-composite')).toBe('CT-CHA-P-400X300-D6');
    expect(representativePartNumber('charuco-ceramic')).toBe('CT-CHA-C-150X100-D6');
    expect(representativePartNumber('checkerboard-composite')).toBe('CT-CHT-P-400X300-F');
    expect(representativePartNumber('aprilgrid-composite')).toBeUndefined();
    expect(representativePartNumber('mounting-fixture')).toBeUndefined();
    for (const h of ['charuco-composite', 'charuco-ceramic', 'checkerboard-composite']) {
      expect(drawingForPartNumber(representativePartNumber(h)!, { dimensions: false })).toBeTruthy();
    }
  });
});
