import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { reprojectionRows } from './guideFigures';

/**
 * The reprojection-error guide. Every number is recomputed from the saved sessions in
 * docs/content/experiments/reprojection-error/results/sessions.json (14 cases x 20 sessions, each solved three ways);
 * the script in the text is the file that was run and its output is the saved output.
 */
const DIR = 'docs/content/experiments/reprojection-error';
const md = readFileSync('src/content/guides/reprojection-error.md', 'utf8');
const front = md.slice(0, md.indexOf('---', 4));
const body = md.slice(md.indexOf('---', 4) + 3);
const flat = body.replace(/\s+/g, ' ');
type Ring = { corners: number; mean: number | null };
type Solve = { rms: number; model_worst: number; fx: number; fx_std: number | null; per_view: number[]; held_out_rms: number; straight_edge: [number, number]; radius: Ring[] };
type Model = 'default' | 'k1_only' | 'rational_thin_prism';
type Session = { views: number; bad_view: number | null; without_bad_view?: Solve } & Record<Model, Solve>;
const S = JSON.parse(readFileSync(`${DIR}/results/sessions.json`, 'utf8')) as { true: { fx: number }; results: Record<string, Session[]> };
const R = S.results;
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const med = (c: string, f: (s: Solve) => number, m: Model = 'default') => median(R[c].map((s) => f(s[m])));
const px = (v: number) => `${v.toFixed(v >= 10 ? 1 : 2)} px`;
const rms = (c: string, m: Model = 'default') => `${med(c, (s) => s.rms, m).toFixed(3)} px`;
const model = (c: string, m: Model = 'default') => px(med(c, (s) => s.model_worst, m));
const held = (c: string, m: Model = 'default') => `${med(c, (s) => s.held_out_rms, m).toFixed(3)} px`;
const edge = (c: string, m: Model = 'default') => px(med(c, (s) => s.straight_edge[0], m));
const fxErr = (c: string) => med(c, (s) => Math.abs(s.fx - S.true.fx));

function tableAfter(heading: string): string[][] {
  const lines = body.split('\n'); const h = lines.findIndex((l) => l.startsWith(heading)); expect(h).toBeGreaterThan(-1);
  const i = lines.findIndex((l, k) => k > h && l.startsWith('|'));
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  return rows;
}
const values = (heading: string) => tableAfter(heading).map((r) => r.slice(1));

describe('what RMS reacts to and what it misses', () => {
  it('14 cases of 20 sessions, 20 views each except the five-view case', () => {
    expect(Object.keys(R)).toHaveLength(14);
    for (const [c, v] of Object.entries(R)) { expect(v).toHaveLength(20); for (const s of v) expect(s.views).toBe(c === 'five_views' ? 5 : 20); }
  });
  it('table: what sets its level', () => {
    expect(values('## What sets its level')).toEqual(['good', 'blur_2px', 'blur_3px', 'noise_x4'].map((c) => [rms(c), model(c)]));
    const m = ['blur_2px', 'blur_3px', 'noise_x4'].map((c) => med(c, (s) => s.model_worst));
    expect(Math.max(...m)).toBeLessThanOrEqual(0.405); expect(Math.max(...m) - med('good', (s) => s.model_worst)).toBeLessThan(0.25);
    expect(flat).toContain(`raised it from ${rms('good').replace(' px', '')} to as much as ${rms('noise_x4')} while the model stayed within 0.40 px`);
    expect(med('noise_x4', (s) => s.rms) / med('good', (s) => s.rms)).toBeGreaterThan(2);
  });
  it('table: what it does not show', () => {
    expect(values('## What it does not show')).toEqual([
      [rms('good'), model('good')], [rms('middle_only'), model('middle_only')], [rms('tilt_under_5'), model('tilt_under_5')], [rms('five_views'), model('five_views')],
      [rms('good', 'rational_thin_prism'), model('good', 'rational_thin_prism')], [rms('middle_only', 'rational_thin_prism'), model('middle_only', 'rational_thin_prism')],
      [rms('square_1pct_off'), model('square_1pct_off')],
    ]);
    for (const r of values('## What it does not show')) expect(parseFloat(r[0])).toBeLessThanOrEqual(parseFloat(rms('good')));
  });
  it('table: what it shows, quietly', () => {
    const cases = ['good', 'one_view_shear_1px', 'one_view_shear_2px', 'one_view_shear_5px', 'stretched_0.3pct', 'bowed_0.5mm', 'bowed_1mm'];
    expect(values('## What it shows, quietly')).toEqual([...cases.map((c) => [rms(c), model(c)]), [rms('good', 'k1_only'), model('good', 'k1_only')]]);
    const ratio = med('bowed_1mm', (s) => s.rms) / med('good', (s) => s.rms);
    expect(ratio).toBeGreaterThan(9); expect(ratio).toBeLessThan(10);
  });
  it('short answer, key rule and FAQ', () => {
    expect(flat).toContain(`Board always in the middle: RMS ${rms('middle_only')}, model ${model('middle_only')} off.`);
    expect(flat).toContain(`A board bowed by 1 mm: RMS ${rms('bowed_1mm')}, model ${model('bowed_1mm')} off.`);
    expect([med('bowed_1mm', (s) => s.rms).toFixed(2), med('bowed_1mm', (s) => s.model_worst).toFixed(0), med('middle_only', (s) => s.rms).toFixed(2), med('middle_only', (s) => s.model_worst).toFixed(1)]).toEqual(['0.22', '19', '0.02', '3.7']);
    expect(front).toContain('gave an RMS of 0.22 px and a model 19 px off; a board kept in the middle gave 0.02 px and 3.7 px off');
    expect(front).toContain(`the RMS was ${rms('middle_only')}, lower than the good set, and the lens model was ${model('middle_only')} off`);
    expect(front).toContain(`the same RMS as the five-term one, ${rms('good')}, and a lens model off by ${model('good', 'rational_thin_prism')} instead of ${model('good')}`);
    expect(front).toContain(`five views gave ${rms('five_views')} against ${rms('good')} for twenty, while the lens model got worse, ${model('five_views')} against ${model('good')}`);
    expect(front).toContain('a good set gave 0.023 px, and blur or noise alone raised that to 0.03 to 0.06 px');
    expect((med('good', (s) => s.model_worst) / med('good', (s) => s.rms)).toFixed(0)).toBe('7');
    expect(flat).toContain(`the model error was ${model('good')} against an RMS of ${rms('good')}, seven times larger`);
    expect(((2 * Math.atan(960 / 2250) * 180) / Math.PI).toFixed(0)).toBe('46');
  });
  it('"what we got wrong"', () => {
    const all = Object.keys(R).filter((c) => c !== 'bowed_1mm').map((c) => med(c, (s) => s.rms));
    expect(Math.max(...all)).toBeLessThan(0.15);
    const bad = ['bowed_0.5mm', 'bowed_1mm', 'stretched_0.3pct'].map((c) => med(c, (s) => s.rms));
    expect([Math.min(...bad).toFixed(2), Math.max(...bad).toFixed(2)]).toEqual(['0.05', '0.22']);
    expect(flat).toContain(`the model error doubled, from ${model('good').replace(' px', '')} to ${model('good', 'rational_thin_prism')}`);
    expect(flat).toContain(`${rms('five_views')} against ${rms('good')}. Barely lower.`);
  });
});

describe('the checks', () => {
  const flagged = (c: string) => {
    let bad = 0, other = 0; const ratio: number[] = [];
    for (const s of R[c]) { const pv = s.default.per_view, m = median(pv); ratio.push(Math.max(...pv) / m); pv.forEach((e, i) => { if (e > 3 * m) { if (i === s.bad_view) bad++; } }); if (pv.some((e, i) => e > 3 * m && i !== s.bad_view)) other++; }
    return { bad, other, ratio: median(ratio) };
  };
  it('check 1: error per view', () => {
    expect(values('## Check 1')).toEqual(['one_view_shear_1px', 'one_view_shear_2px', 'one_view_shear_5px'].map((c) => [`${flagged(c).bad} of 20`, model(c), px(median(R[c].map((s) => s.without_bad_view!.model_worst)))]));
    expect(flagged('good').other).toBe(1);
    expect(flat).toContain('in the good set, 1 session of 20 had a clean view above three times the median');
    const r = ['middle_only', 'bowed_0.5mm', 'bowed_1mm'].map((c) => flagged(c).ratio);
    expect([Math.min(...r).toFixed(1), Math.max(...r).toFixed(1)]).toEqual(['1.5', '1.8']); expect(flagged('good').ratio).toBeGreaterThan(Math.max(...r));
    expect(flat).toContain('A view sheared by 5 px was flagged in 20 of 20 sessions, one sheared by 1 px in 10 of 20.');
  });
  it('check 2: rings', () => {
    const ring = (c: string, m: Model, k: number) => { let n = 0, sum = 0; for (const s of R[c]) { const b = s[m].radius[k]; n += b.corners; sum += b.corners * (b.mean ?? 0); } return { n, mean: n ? sum / n : null }; };
    const cell = (c: string, k: number) => { const r = ring(c, 'default', k); return [r.n ? r.mean!.toFixed(3) : 'none', r.n.toLocaleString('en-US')]; };
    expect(values('## Check 2')).toEqual([0, 1, 2, 3].map((k) => [...cell('good', k), ring('good', 'k1_only', k).mean!.toFixed(3), ...cell('middle_only', k)]));
    expect(ring('middle_only', 'default', 2).n + ring('middle_only', 'default', 3).n).toBe(47);
    expect(ring('good', 'default', 2).n + ring('good', 'default', 3).n).toBeGreaterThan(4000);
  });
  it('check 3: held-out views and a straight edge', () => {
    const row = (c: string, m: Model = 'default') => [rms(c, m), held(c, m), edge(c, m), model(c, m)].map((v) => v.replace(' px', ''));
    expect(values('## Check 3')).toEqual([row('good'), row('middle_only'), row('middle_only', 'rational_thin_prism'), row('good', 'rational_thin_prism'), row('tilt_under_5'), row('bowed_1mm')]);
    const ho = med('middle_only', (s) => s.held_out_rms) / med('middle_only', (s) => s.rms);
    expect(ho).toBeGreaterThan(1.4); expect(ho).toBeLessThan(1.5);
    expect(flat).toContain('nearly one and a half times the fitted one');
    expect(flat).toContain(`After undistortion it bent by ${edge('middle_only')} with the board kept in the middle, against ${edge('good')} for the good set.`);
    expect(flat).toContain(`the bowed board bends the edge by only ${edge('bowed_1mm')} while its focal length is off by ${px(fxErr('bowed_1mm'))}`);
  });
  it('the solver\'s own standard deviation of the focal length', () => {
    expect(values('## What the solver says about itself')).toEqual(['good', 'tilt_under_5', 'one_view_shear_5px', 'bowed_1mm'].map((c) => [px(med(c, (s) => s.fx_std!)), px(fxErr(c))]));
  });
});

describe('script and figure', () => {
  const blocks = [...body.matchAll(/```(\w+)\n([\s\S]*?)```/g)];
  it('the script in the text is the file that was run, with its saved output', () => {
    expect(blocks.filter(([, l]) => l === 'python').map(([, , t]) => t)).toEqual([readFileSync(`${DIR}/check.py`, 'utf8')]);
    expect(blocks.filter(([, l]) => l === 'text').map(([, , t]) => t)).toEqual([readFileSync(`${DIR}/results/check.txt`, 'utf8')]);
    const e = JSON.parse(readFileSync(`${DIR}/results/end_to_end.json`, 'utf8')) as { sheared_view: string; all_views: { model_worst: number }; without_it: { model_worst: number } };
    expect(flat).toContain(`\`${e.sheared_view}\` is the sheared one. With it, the lens model was ${px(e.all_views.model_worst)} off; without it, ${px(e.without_it.model_worst)}.`);
  });
  it('alt text of the figure carries the values the figure draws', () => {
    const r = reprojectionRows(R).map((x) => `${x.rms.toFixed(3)}, ${x.edge.toFixed(x.edge >= 10 ? 1 : 2)}`);
    expect(body).toContain(`Good set: ${r[0]}. Board in the middle: ${r[1]}. Never tilted: ${r[2]}. One sheared view: ${r[3]}. Stretched print: ${r[4]}. Bowed 1 mm: ${r[5]}.`);
  });
});
