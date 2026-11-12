/**
 * USAF 1951 resolution target (MIL-STD-150A) as geometry.
 *
 * What is fixed by the standard and exact here: an element is three bars and two spaces of equal
 * width, bars five line widths long, once with the lines vertical and once horizontal;
 * resolution in lp/mm = 2^(group + (element - 1) / 6), so line width = 1 / (2 × lp/mm).
 *
 * What is arranged the way charts are commonly laid out, and not dimensioned by this module against
 * the standard: where the elements sit. Groups come in pairs (even, odd). Elements 2–6 of the even
 * group run down the left side, its element 1 sits at the bottom right, the odd group's elements
 * run down the right side above it, and the next pair repeats at a quarter of the size in between.
 */
export interface UsafBar { x: number; y: number; w: number; h: number }
export interface UsafElement { group: number; element: number; lpPerMm: number; lineWidth: number; x: number; y: number; bars: UsafBar[] }
export interface UsafLabel { text: string; x: number; y: number; size: number; anchor: 'start' | 'middle' | 'end' }
export interface UsafTarget { width: number; height: number; elements: UsafElement[]; labels: UsafLabel[] }

/** Line pairs per millimeter of a group and element. */
export const usafLpPerMm = (group: number, element: number): number => 2 ** (group + (element - 1) / 6);
/** Width of one bar (and of one space) in mm. */
export const usafLineWidth = (group: number, element: number): number => 1 / (2 * usafLpPerMm(group, element));

const ELEMENT_W = 12;   // in line widths: 5 (vertical-line block) + 2 (gap) + 5 (horizontal-line block)
const ELEMENT_PITCH = 7.5; // in line widths: 5 high + 2.5 gap to the next element
const PAD = 2;          // in line widths of the pair's first element
const LABEL = 3;        // room for element numbers beside a column, in line widths of the pair's first element

function elementAt(group: number, element: number, x: number, y: number): UsafElement {
  const w = usafLineWidth(group, element);
  const bars: UsafBar[] = [];
  for (let i = 0; i < 3; i++) bars.push({ x: x + 2 * i * w, y, w, h: 5 * w });               // lines running vertically
  for (let i = 0; i < 3; i++) bars.push({ x: x + 7 * w, y: y + 2 * i * w, w: 5 * w, h: w }); // lines running horizontally
  return { group, element, lpPerMm: usafLpPerMm(group, element), lineWidth: w, x, y, bars };
}

/** Width of one pair of groups and everything nested inside it, in line widths of its first element. */
const PAIR_W = (() => {
  // left column (element 2 of the even group) + labels + nested pair at 1/4 + padding + right column (element 1) + labels
  const fixed = LABEL + ELEMENT_W * 2 ** (-1 / 6) + PAD + PAD + ELEMENT_W + LABEL;
  return fixed / (1 - 1 / 4);
})();
const PAIR_H = (() => {
  const left = ELEMENT_PITCH * [1, 2, 3, 4, 5].reduce((a, k) => a + 2 ** (-k / 6), 0);
  const right = ELEMENT_PITCH * 0.5 * [0, 1, 2, 3, 4, 5].reduce((a, k) => a + 2 ** (-k / 6), 0) + ELEMENT_PITCH;
  return Math.max(left, right) + 4; // 4 line widths above the columns for the group numbers
})();

function layPair(evenGroup: number, lastGroup: number, ox: number, oy: number, out: UsafTarget): void {
  const u = usafLineWidth(evenGroup, 1); // unit: line width of the pair's first element
  const top = oy + 4 * u;
  const labelSize = 2.2 * u;
  // even group, elements 2–6 down the left
  const leftX = ox + LABEL * u;
  let y = top;
  out.labels.push({ text: String(evenGroup), x: leftX + (ELEMENT_W * u * 2 ** (-1 / 6)) / 2, y: oy + 3 * u, size: labelSize, anchor: 'middle' });
  for (let e = 2; e <= 6; e++) {
    const w = usafLineWidth(evenGroup, e);
    out.elements.push(elementAt(evenGroup, e, leftX, y));
    out.labels.push({ text: String(e), x: leftX - 0.8 * u, y: y + 3.6 * w, size: Math.min(labelSize, 3 * w), anchor: 'end' });
    y += ELEMENT_PITCH * w;
  }
  // odd group, elements 1–6 down the right; the even group's element 1 below them
  const rightX = ox + (PAIR_W - LABEL - ELEMENT_W) * u;
  const odd = evenGroup + 1;
  y = top;
  if (odd <= lastGroup) {
    out.labels.push({ text: String(odd), x: rightX + (ELEMENT_W * u) / 4, y: oy + 3 * u, size: labelSize, anchor: 'middle' });
    for (let e = 1; e <= 6; e++) {
      const w = usafLineWidth(odd, e);
      out.elements.push(elementAt(odd, e, rightX, y));
      out.labels.push({ text: String(e), x: rightX + ELEMENT_W * w + 0.8 * u, y: y + 3.6 * w, size: Math.min(labelSize, 3 * w * 2), anchor: 'start' });
      y += ELEMENT_PITCH * w;
    }
  }
  const e1y = oy + (PAIR_H - ELEMENT_PITCH + 2.5 - 0.5) * u;
  out.elements.push(elementAt(evenGroup, 1, rightX, e1y));
  out.labels.push({ text: '1', x: rightX + ELEMENT_W * u + 0.8 * u, y: e1y + 3.6 * u, size: labelSize, anchor: 'start' });
  // next pair, a quarter of the size, between the columns
  if (evenGroup + 2 <= lastGroup) {
    const innerX = ox + (LABEL + ELEMENT_W * 2 ** (-1 / 6) + PAD) * u;
    const innerY = oy + ((PAIR_H - PAIR_H / 4) / 2) * u;
    layPair(evenGroup + 2, lastGroup, innerX, innerY, out);
  }
}

/** A target from `firstGroup` (even) through `lastGroup`, with a margin of `margin` mm around it. */
export function usaf1951(firstGroup: number, lastGroup: number, margin = 0): UsafTarget {
  if (firstGroup % 2 !== 0) throw new Error('The first group of a USAF 1951 layout is an even number.');
  if (lastGroup < firstGroup) throw new Error('lastGroup is below firstGroup.');
  const u = usafLineWidth(firstGroup, 1);
  const out: UsafTarget = { width: PAIR_W * u + 2 * margin, height: PAIR_H * u + 2 * margin, elements: [], labels: [] };
  layPair(firstGroup, lastGroup, margin, margin, out);
  return out;
}

/** SVG of the target in mm units. `negative` gives clear bars on a dark field. */
export function usaf1951Svg(t: UsafTarget, opts: { negative?: boolean; labels?: boolean } = {}): string {
  const ink = opts.negative ? '#fff' : '#000', ground = opts.negative ? '#000' : '#fff';
  const r = (v: number) => +v.toFixed(5);
  const bars = t.elements.flatMap((e) => e.bars).map((b) => `<rect x="${r(b.x)}" y="${r(b.y)}" width="${r(b.w)}" height="${r(b.h)}"/>`).join('');
  const labels = opts.labels === false ? '' : t.labels.map((l) => `<text x="${r(l.x)}" y="${r(l.y)}" font-size="${r(l.size)}" text-anchor="${l.anchor}">${l.text}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r(t.width)}mm" height="${r(t.height)}mm" viewBox="0 0 ${r(t.width)} ${r(t.height)}" role="img" aria-label="USAF 1951 resolution target, groups ${t.elements[0].group} to ${Math.max(...t.elements.map((e) => e.group))}"><rect width="${r(t.width)}" height="${r(t.height)}" fill="${ground}"/><g fill="${ink}">${bars}</g><g fill="${ink}" font-family="'Geist Mono', monospace">${labels}</g></svg>`;
}
