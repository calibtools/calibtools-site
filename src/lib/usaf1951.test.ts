import { describe, it, expect } from 'vitest';
import { usaf1951, usaf1951Svg, usafLpPerMm, usafLineWidth } from './usaf1951';

describe('USAF 1951 geometry', () => {
  it('resolution and line width follow the standard formula', () => {
    expect(usafLpPerMm(0, 1)).toBe(1);
    expect(usafLpPerMm(2, 3)).toBeCloseTo(5.04, 2);   // the worked example in the guide
    expect(usafLpPerMm(5, 1)).toBeCloseTo(32.0, 6);
    expect(usafLineWidth(5, 1) * 1000).toBeCloseTo(15.625, 3); // µm
    expect(usafLpPerMm(7, 6)).toBeCloseTo(228.1, 1);
    expect(usafLineWidth(7, 6) * 1000).toBeCloseTo(2.19, 2);
  });

  const t = usaf1951(0, 7, 2);

  it('has six elements in every group', () => {
    expect(t.elements).toHaveLength(8 * 6);
    for (let g = 0; g <= 7; g++) expect(t.elements.filter((e) => e.group === g).map((e) => e.element).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('every element is three bars one line width wide, five long, one line width apart, in both directions', () => {
    for (const e of t.elements) {
      const w = usafLineWidth(e.group, e.element);
      expect(e.lineWidth).toBe(w);
      const vertical = e.bars.slice(0, 3), horizontal = e.bars.slice(3);
      for (const b of vertical) { expect(b.w).toBeCloseTo(w, 12); expect(b.h).toBeCloseTo(5 * w, 12); }
      for (const b of horizontal) { expect(b.h).toBeCloseTo(w, 12); expect(b.w).toBeCloseTo(5 * w, 12); }
      expect(vertical[1].x - vertical[0].x).toBeCloseTo(2 * w, 12);
      expect(vertical[2].x - vertical[1].x).toBeCloseTo(2 * w, 12);
      expect(horizontal[1].y - horizontal[0].y).toBeCloseTo(2 * w, 12);
    }
  });

  it('no two elements overlap and everything stays on the plate', () => {
    const boxes = t.elements.map((e) => ({ x0: e.x, y0: e.y, x1: e.x + 12 * e.lineWidth, y1: e.y + 5 * e.lineWidth }));
    for (const b of boxes) { expect(b.x0).toBeGreaterThanOrEqual(2); expect(b.y0).toBeGreaterThanOrEqual(2); expect(b.x1).toBeLessThanOrEqual(t.width - 2); expect(b.y1).toBeLessThanOrEqual(t.height - 2); }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const apart = a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0;
      if (!apart) throw new Error(`elements ${t.elements[i].group}-${t.elements[i].element} and ${t.elements[j].group}-${t.elements[j].element} overlap`);
    }
  });

  it('writes an SVG in millimeters with one rect per bar', () => {
    const svg = usaf1951Svg(t);
    expect(svg).toContain(`viewBox="0 0 ${+t.width.toFixed(5)} ${+t.height.toFixed(5)}"`);
    expect(svg.match(/<rect /g)!.length).toBe(1 + 48 * 6);
    expect(usaf1951Svg(t, { negative: true })).toContain('fill="#000"/><g fill="#fff">');
  });

  it('rejects an odd first group', () => {
    expect(() => usaf1951(1, 4)).toThrow();
  });
});
