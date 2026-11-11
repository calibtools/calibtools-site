import { describe, it, expect } from 'vitest';
import { caltabGeometry, caltabDescr, parseDescr, caltabSvg, caltabSize, largestMarkDist } from './halconCaltab';

/** MVTec's documented example: gen_caltab(7, 7, 0.0125, 0.5, ...) */
const mvtec = caltabGeometry({ xNum: 7, yNum: 7, markDist: 12.5, diameterRatio: 0.5 });

describe('caltabGeometry', () => {
  it('reproduces the values of the documented 7 x 7 example', () => {
    expect(mvtec.marks).toHaveLength(49);
    expect(mvtec.marks[0]).toEqual({ x: -37.5, y: -37.5, r: 3.125 });
    expect(mvtec.marks[1]).toEqual({ x: -25, y: -37.5, r: 3.125 });
    expect(mvtec.marks[48]).toEqual({ x: 37.5, y: 37.5, r: 3.125 });
    expect(mvtec.frame).toEqual({ minX: -50, minY: -50, maxX: 50, maxY: 50 });
    expect(mvtec.frameWidth).toBe(3.125);
    expect(mvtec.rim).toEqual({ minX: -51.25, minY: -51.25, maxX: 51.25, maxY: 51.25 });
    expect(mvtec.triangle).toEqual([[-50, -37.5], [-37.5, -50]]);
  });

  it('frame is 80 mm wide for 7 marks at 10 mm, as the documentation states', () => {
    const g = caltabGeometry({ xNum: 7, yNum: 7, markDist: 10, diameterRatio: 0.5 });
    expect(g.frame.maxX - g.frame.minX).toBe(80);
    expect(g.marks[0].r).toBe(2.5);
  });

  it('lists marks row by row from the top, left to right, centered on the origin', () => {
    const g = caltabGeometry({ xNum: 9, yNum: 6, markDist: 24, diameterRatio: 0.5 });
    expect(g.marks).toHaveLength(54);
    expect(g.marks[0]).toMatchObject({ x: -96, y: -60 });
    expect(g.marks[8]).toMatchObject({ x: 96, y: -60 });
    expect(g.marks[9]).toMatchObject({ x: -96, y: -36 });
    const sum = g.marks.reduce((a, k) => [a[0] + k.x, a[1] + k.y], [0, 0]);
    expect(sum[0]).toBeCloseTo(0, 6);
    expect(sum[1]).toBeCloseTo(0, 6);
  });

  it('rejects impossible parameters', () => {
    expect(() => caltabGeometry({ xNum: 1, yNum: 7, markDist: 10, diameterRatio: 0.5 })).toThrow();
    expect(() => caltabGeometry({ xNum: 7, yNum: 7, markDist: 0, diameterRatio: 0.5 })).toThrow();
    expect(() => caltabGeometry({ xNum: 7, yNum: 7, markDist: 10, diameterRatio: 1 })).toThrow();
  });
});

describe('caltabDescr', () => {
  const text = caltabDescr(mvtec);
  const data = text.split('\n').filter((l) => l && !l.startsWith('#'));

  it('writes the data lines of the documented example, in meters', () => {
    expect(text.split('\n')[0]).toBe('# Plate Description Version 2');
    expect(data.slice(0, 7)).toEqual([
      'r 7', 'c 7', 'z 0',
      'o -0.05125 0.05125 0.05125 -0.05125',
      'i -0.05 0.05 0.05 -0.05',
      't -0.05 -0.0375 -0.0375 -0.05',
      'w 0.003125',
    ]);
    expect(data.slice(7, 11)).toEqual(['-0.0375 -0.0375 0.003125', '-0.025 -0.0375 0.003125', '-0.0125 -0.0375 0.003125', '0 -0.0375 0.003125']);
    expect(data).toHaveLength(7 + 49);
  });

  it('reads back to the same geometry', () => {
    expect(parseDescr(text)).toEqual(mvtec);
    const g = caltabGeometry({ xNum: 11, yNum: 8, markDist: 31.5, diameterRatio: 0.45 });
    expect(parseDescr(caltabDescr(g))).toEqual(g);
  });
});

describe('parseDescr', () => {
  it('accepts a file without the optional lines and with exponent notation', () => {
    const g = parseDescr(['r 2', 'c 2', 'i -0.03 0.03 0.03 -0.03', 'w 0.005', '-0.01 -0.01 0.004', '1e-2 -0.01 0.004', '-0.01 0.01 0.004', '-3.46945e-018 0.01 0.004'].join('\n'));
    expect(g.triangle).toBeNull();
    expect(g.rim).toEqual(g.frame);
    expect(g.marks[1].x).toBe(10);
    expect(g.marks[3].x).toBeCloseTo(0, 9);
  });
  it('refuses a file whose mark count does not match', () => {
    expect(() => parseDescr('r 2\nc 2\ni -1 1 1 -1\nw 0.1\n0 0 0.1')).toThrow(/expected 2 x 2/);
    expect(() => parseDescr('r 2\nc 2\nhello')).toThrow(/Unrecognized/);
  });
});

describe('caltabSvg', () => {
  it('draws frame, triangle and every mark at 1:1, centered on the board', () => {
    const svg = caltabSvg(mvtec, 200, 150);
    expect(svg).toContain('width="200mm" height="150mm" viewBox="0 0 200 150"');
    expect(svg.match(/data-part="mark"/g)).toHaveLength(49);
    expect(svg).toContain('<circle data-part="mark" cx="62.5" cy="37.5" r="3.125" fill="#000"/>');
    expect(svg).toContain('<circle data-part="mark" cx="137.5" cy="112.5" r="3.125" fill="#000"/>');
    // frame outer 50..150 x 25..125, inner inset by 3.125
    expect(svg).toContain('d="M50 25H150V125H50ZM53.125 28.125V121.875H146.875V28.125Z"');
    // triangle in the top-left corner of the frame, legs one mark distance
    expect(svg).toContain('data-part="triangle" fill="#000" d="M50 25L50 37.5L62.5 25Z"');
  });
  it('refuses a plate larger than the board', () => {
    expect(() => caltabSvg(mvtec, 100, 100)).toThrow(/does not fit/);
  });
  it('draws a plate without a triangle when the description has none', () => {
    expect(caltabSvg({ ...mvtec, triangle: null }, 200, 150)).not.toContain('triangle');
  });
});

describe('largestMarkDist', () => {
  it('gives a mark distance at which the plate fits each catalog board with a 15 mm margin', () => {
    for (const [w, h, x, y] of [[200, 150, 7, 5], [300, 200, 9, 6], [400, 300, 9, 7], [600, 400, 11, 7], [800, 600, 11, 8]] as const) {
      const d = largestMarkDist(x, y, w, h, 15);
      const size = caltabSize(caltabGeometry({ xNum: x, yNum: y, markDist: d, diameterRatio: 0.5 }));
      expect(size.w, `${w}x${h}`).toBeLessThanOrEqual(w - 30);
      expect(size.h, `${w}x${h}`).toBeLessThanOrEqual(h - 30);
      expect(d).toBeGreaterThan(10);
    }
  });
});
