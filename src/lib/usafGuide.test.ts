import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { usafLpPerMm, usafLineWidth } from './usaf1951';
import { usafThreeBarsFigureSvg, usafThreeBarsPct, usafBarWidthPx, USAF_FIGURE_CASES, USAF_FIGURE_ELEMENTS, type UsafLooks } from './guideFigures';

/**
 * The USAF guide: the two tables come from the formula, every number about readings is recomputed here from the
 * 500 saved looks per case in docs/content/experiments/usaf-reading/results/looks.json, and the script and its
 * output in the text are the files in that folder.
 */
const DIR = 'docs/content/experiments/usaf-reading';
const md = readFileSync('src/content/guides/usaf-1951-lp-mm-table.md', 'utf8');
const front = md.slice(0, md.indexOf('---', 4));
const body = md.slice(md.indexOf('---', 4) + 3);
const flat = body.replace(/\s+/g, ' ');
const d = JSON.parse(readFileSync(`${DIR}/results/looks.json`, 'utf8')) as UsafLooks;
const F = d.freqs_cycles_per_pixel, NYQ = d.nyquist_index;
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const reading = (c: number[]) => { const bad = c.findIndex((n) => n !== 3); return (bad < 0 ? c.length : bad) - 1; };
const readings = (name: string) => d.cases[name].counts.map(reading);
const rel = (i: number) => (F[i] / 0.5).toFixed(2);
const mtf = (f: number, blur: number) => Math.exp(-2 * Math.PI ** 2 * blur ** 2 * f ** 2) * Math.abs(Math.sin(Math.PI * f) / (Math.PI * f));
const mtf50 = (blur: number) => { let lo = 0.001, hi = 1; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (mtf(m, blur) > 0.5) lo = m; else hi = m; } return lo; };
const pct = (x: number) => `${Math.round(100 * x)} %`;
const disagree = (name: string) => { const r = readings(name), h = r.length >> 1; return r.slice(0, h).filter((x, i) => x !== r[h + i]).length / h; };
const aboveNyquist = (name: string) => d.cases[name].counts.filter((c) => c.slice(NYQ + 1).includes(3)).length / d.looks;
const again = (name: string) => d.cases[name].counts.filter((c) => c.slice(reading(c) + 2).includes(3)).length / d.looks;

function tableAfter(heading: string, firstHeader: string, nth = 0): string[][] {
  const lines = body.split('\n'); const h = lines.findIndex((l) => l.startsWith(heading)); expect(h).toBeGreaterThan(-1);
  let i = h; for (let k = 0; k <= nth; k++) i = lines.findIndex((l, j) => j > i && l.startsWith(`| ${firstHeader} |`));
  expect(i).toBeGreaterThan(-1);
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  return rows;
}

describe('the lookup tables', () => {
  const sig = (v: number) => (v >= 1000 ? v.toFixed(0) : v.toPrecision(3));
  const groups = [[-2, -1, 0, 1, 2, 3], [4, 5, 6, 7, 8, 9]];
  it('lp/mm for every group and element', () => {
    groups.forEach((g, n) => expect(tableAfter('## Line pairs per millimeter', 'Element', n)).toEqual([1, 2, 3, 4, 5, 6].map((e) => [String(e), ...g.map((x) => sig(usafLpPerMm(x, e)))])));
  });
  it('bar width in µm for every group and element', () => {
    groups.forEach((g, n) => expect(tableAfter('## Line width', 'Element', n)).toEqual([1, 2, 3, 4, 5, 6].map((e) => [String(e), ...g.map((x) => sig(usafLineWidth(x, e) * 1000))])));
  });
  it('FAQ example', () => {
    expect(usafLpPerMm(2, 3).toFixed(2)).toBe('5.04'); expect((usafLineWidth(2, 3) * 1000).toFixed(0)).toBe('99');
    expect((2 ** (1 / 6)).toFixed(2)).toBe('1.12'); expect((1 / (2 * 0.00345)).toFixed(0)).toBe('145');
  });
});

describe('readings', () => {
  it('500 looks per case over elements from 0.18 to 2 times Nyquist', () => {
    expect(d.looks).toBe(500); expect(Object.keys(d.cases)).toHaveLength(18);
    for (const c of Object.values(d.cases)) { expect(c.counts).toHaveLength(500); expect(c.counts[0]).toHaveLength(F.length); }
    expect([rel(0), rel(F.length - 1), rel(NYQ)]).toEqual(['0.18', '2.00', '1.00']);
  });
  const blurs: [string, string][] = [['pixels only', 'None'], ['blur 0.3', '0.3 px'], ['blur 0.5', '0.5 px'], ['blur 0.8', '0.8 px'], ['blur 1.2', '1.2 px'], ['blur 2.0', '2.0 px']];
  it('table: a sharp lens', () => {
    expect(tableAfter('## A sharp lens', 'Lens blur')).toEqual(blurs.map(([n, l]) => { const r = readings(n); return [l, rel(Math.min(...r)), rel(median(r)), rel(Math.max(...r)), pct(disagree(n)), pct(aboveNyquist(n))]; }));
  });
  it('table: a soft lens, and MTF50 against the reading', () => {
    const soft = blurs.slice(3);
    expect(tableAfter('## A soft lens', 'Lens blur')).toEqual(soft.map(([n, l]) => { const r = median(readings(n)), b = d.cases[n].blur; return [l, `${rel(r)} × Nyquist`, `${(0.5 / F[r]).toFixed(2)} px`, mtf(F[r], b).toFixed(2), mtf(F[r + 1], b).toFixed(2)]; }));
    const ratio = soft.map(([n]) => mtf50(d.cases[n].blur) / F[median(readings(n))]);
    expect([Math.min(...ratio).toFixed(2), Math.max(...ratio).toFixed(2)]).toEqual(['0.59', '0.62']);
    expect(flat).toContain('MTF50, was 0.59 to 0.62 of the reading');
    for (const [n] of soft) expect(new Set(readings(n)).size).toBe(1);
    expect(flat).toContain('The reading sits where 14 to 17 % is left.');
  });
  it('table: the reader', () => {
    const rows = [['2 %', 'blur 1.2, threshold 0.02'], ['5 %', 'blur 1.2, threshold 0.05'], ['10 %', 'blur 1.2'], ['20 %', 'blur 1.2, threshold 0.2'], ['30 %', 'blur 1.2, threshold 0.3']];
    expect(tableAfter('## The reader', 'A bar counts when it stands out by')).toEqual(rows.map(([l, n]) => { const r = median(readings(n)); return [l, `${rel(r)} × Nyquist`, mtf(F[r], 1.2).toFixed(2)]; }));
    const first = median(readings(rows[0][1])), last = median(readings(rows[4][1]));
    expect(first - last).toBe(4); expect((F[first] / F[last]).toFixed(2)).toBe('1.59');
    expect(flat).toContain('Four elements lie between the first row and the last, a factor of 1.59 in lp/mm.');
  });
  it('steady above about 1.3 px, moving below', () => {
    for (const n of Object.keys(d.cases)) {
      const r = readings(n), widths = r.map((i) => 0.5 / F[i]);
      if (new Set(r).size === 1) expect(Math.min(...widths)).toBeGreaterThan(1.3); else expect(Math.max(...widths)).toBeLessThan(1.3);
    }
    const py = readFileSync(`${DIR}/usaf.py`, 'utf8');
    expect(py).toContain('if bar_px < 1.3:');
  });
  it('short answer and "what we got wrong"', () => {
    const span = (n: string) => Math.max(...readings(n)) - Math.min(...readings(n)) + 1;
    expect(['pixels only', 'blur 0.3', 'blur 0.5'].map(span)).toEqual([4, 3, 3]);
    expect(flat).toContain('With no blur at all: 0.89 to 1.26 times Nyquist.');
    expect(pct(aboveNyquist('pixels only'))).toBe('51 %');
    expect(flat).toContain('With no lens blur, 51 % of looks counted three bars in an element finer than the sensor can sample.');
    const dis = ['pixels only', 'blur 0.3', 'blur 0.5'].map(disagree);
    expect([pct(Math.min(...dis)), pct(Math.max(...dis))]).toEqual(['56 %', '64 %']);
    expect(flat).toContain('disagreed in 56 to 64 % of pairs by chance');
    const c16 = d.cases['pixels only'].counts.map((c) => c[NYQ + 1]);
    expect(rel(NYQ + 1)).toBe('1.12'); expect(c16.every((n) => n === 2 || n === 3)).toBe(true);
    expect(flat).toContain(`the element at 1.12 times Nyquist showed three bars in ${pct(c16.filter((n) => n === 3).length / 500)} of looks and two bars in the rest`);
    const ag = ['pixels only', 'blur 0.3', 'blur 0.5'].map(again);
    expect([pct(Math.min(...ag)), pct(Math.max(...ag))]).toEqual(['4 %', '6 %']);
    expect(flat).toContain('4 to 6 % of looks showed three bars again');
    for (const n of ['blur 0.8', 'blur 1.2', 'blur 2.0']) expect(again(n)).toBe(0);
    expect((2.3548 * 0.5).toFixed(1)).toBe('1.2'); expect((2.3548 * 1.2).toFixed(1)).toBe('2.8');
  });
  it('chart contrast and noise leave the median where it was', () => {
    const base = median(readings('blur 0.5'));
    for (const n of ['blur 0.5, chart contrast 0.5', 'blur 0.5, chart contrast 0.2', 'blur 0.5, noise 0.01', 'blur 0.5, noise 0.03']) expect(median(readings(n))).toBe(base);
  });
});

describe('script and figure', () => {
  const blocks = [...body.matchAll(/```(\w+)\n([\s\S]*?)```/g)];
  it('the script in the text is the file, and its output is the saved output', () => {
    expect(blocks.filter(([, l]) => l === 'python').map(([, , t]) => t)).toEqual([readFileSync(`${DIR}/usaf.py`, 'utf8')]);
    expect(blocks.filter(([, l]) => l === 'text').map(([, , t]) => t)).toEqual(['usaf_5_1.txt', 'usaf_7_1.txt'].map((f) => readFileSync(`${DIR}/results/${f}`, 'utf8')));
  });
  it('the first figure is what this code draws from the saved looks', () => {
    expect(readFileSync('src/assets/guides/usaf-three-bars-by-bar-width.svg', 'utf8')).toBe(usafThreeBarsFigureSvg(d));
    expect(USAF_FIGURE_ELEMENTS.map((e) => usafBarWidthPx(d, e))).toEqual(['2.00', '1.78', '1.59', '1.41', '1.26', '1.12', '1.00', '0.89', '0.79']);
  });
  it('alt text carries the same percentages', () => {
    const row = (n: string) => USAF_FIGURE_ELEMENTS.map((e) => usafThreeBarsPct(d, n, e));
    expect(row('pixels only')).toEqual([100, 100, 100, 100, 100, 100, 99, 48, 7]);
    expect(row('blur 0.5')).toEqual([100, 100, 100, 100, 100, 92, 67, 0, 0]);
    expect(row('blur 0.8')).toEqual([100, 100, 100, 100, 0, 0, 0, 0, 0]);
    expect(body).toContain('No lens blur: 100 % down to 1.12 px, then 99, 48 and 7 %. Blur 0.5 px: 92 % at 1.12 px, 67 % at 1.00 px, then 0. Blur 0.8 px: 100 % down to 1.41 px, then 0.');
    expect(USAF_FIGURE_CASES).toHaveLength(5);
  });
});
