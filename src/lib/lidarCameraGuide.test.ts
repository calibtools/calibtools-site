import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { lidarUsableFigureSvg, fmtMm, LIDAR_FIGURE_LIDARS, LIDAR_FIGURE_DISTANCES, type LidarUsableRow } from './guideFigures';

/**
 * Every number in the LiDAR-camera guide comes from the saved runs in docs/content/experiments/lidar-camera/results/.
 * Tables and figures in the text are recomputed here from the per-run results, so a number changed by hand fails.
 * The code blocks in the text have to be parts of the scripts those runs used.
 */
const DIR = 'docs/content/experiments/lidar-camera';
const md = readFileSync('src/content/guides/lidar-camera-calibration.md', 'utf8');
const front = md.slice(0, md.indexOf('---', 4));
const body = md.slice(md.indexOf('---', 4) + 3);
const flat = body.replace(/\s+/g, ' ');
const json = (f: string) => JSON.parse(readFileSync(`${DIR}/results/${f}`, 'utf8'));
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

type DetRow = LidarUsableRow & { wrong: number; centre_err_mm: number[] };
const det = (json('detect.json') as { rows: DetRow[] }).rows;
const cell = (lidar: string, a: number, b: number, hole = 120) => det.find((r) => r.lidar === lidar && r.hole_diameter_mm === hole && r.distance[0] === a && r.distance[1] === b)!;
type Run = { run: number; used: number; rot_deg: number; trans_mm: number; at_20m_mm: number; fit_resid_mm: number; holdout_mm?: number };
const C = (json('calibrations.json') as { cases: Record<string, Run[]> }).cases;
const ok = (n: string) => C[n].filter((r) => r.used);
const rot = (n: string) => `${median(ok(n).map((r) => r.rot_deg)).toFixed(2)}°`;
const tr = (n: string) => `${fmtMm(median(ok(n).map((r) => r.trans_mm)))} mm`;
const far = (n: string) => `${median(ok(n).map((r) => r.at_20m_mm)).toFixed(0)} mm`;
const fit = (n: string) => `${fmtMm(median(ok(n).map((r) => r.fit_resid_mm)))} mm`;
const held = (n: string) => `${fmtMm(median(ok(n).filter((r) => r.holdout_mm !== undefined).map((r) => r.holdout_mm!)))} mm`;

function tableAfter(heading: string, firstHeader: string): string[][] {
  const lines = body.split('\n'); const h = lines.findIndex((l) => l.startsWith(heading)); expect(h).toBeGreaterThan(-1);
  const i = lines.findIndex((l, k) => k > h && l.startsWith(`| ${firstHeader} |`)); expect(i).toBeGreaterThan(-1);
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  return rows;
}

describe('finding the holes', () => {
  const names: Record<string, string> = { dense: 'Dense cloud' };
  it('table: placements with four centres and their error, by LiDAR and distance', () => {
    expect(tableAfter('## Finding the holes', 'LiDAR')).toEqual(LIDAR_FIGURE_LIDARS.map((l) => [names[l] ?? l, ...LIDAR_FIGURE_DISTANCES.map(([a, b]) => { const r = cell(l, a, b); return `${r.usable}, ${median(r.centre_err_mm).toFixed(1)} mm`; })]));
    for (const r of det) expect(r.placements).toBe(200);
  });
  it('the few wrong ones', () => {
    const rows = det.filter((r) => r.hole_diameter_mm === 120);
    const total = rows.reduce((a, r) => a + r.usable, 0), wrong = rows.reduce((a, r) => a + r.wrong, 0);
    expect(flat).toContain(`${wrong} of the ${total.toLocaleString('en-US')} in the table, all beyond 4 m`);
    expect(rows.filter((r) => r.distance[0] < 4).every((r) => r.wrong === 0)).toBe(true);
  });
  it('table: hole size', () => {
    const c = (l: string, hole: number) => `${cell(l, 1.5, 2.5, hole).usable} and ${cell(l, 2.5, 4, hole).usable}`;
    expect(tableAfter('## How big the holes need to be', 'Hole diameter')).toEqual([40, 80, 120].map((h) => [`${h} mm`, c('16 lines', h), c('64 lines', h), c('dense', h)]));
  });
  it('short answer and FAQ', () => {
    const pct = (l: string, a: number, b: number, hole = 120) => Math.round((100 * cell(l, a, b, hole).usable) / 200);
    expect([pct('16 lines', 1.5, 2.5), pct('16 lines', 2.5, 4), pct('16 lines', 4, 6), pct('64 lines', 4, 6)]).toEqual([100, 75, 30, 99]);
    expect(flat).toContain('16 lines: every placement usable to 2.5 m, 30 % at 4 to 6 m. 64 lines: 99 % at 4 to 6 m.');
    expect(front).toContain('in every placement at 1.5 to 2.5 m, in 75 % at 2.5 to 4 m and in 30 % at 4 to 6 m');
    expect([cell('64 lines', 1.5, 2.5, 80).usable, cell('64 lines', 2.5, 4, 80).usable]).toEqual([200, 200]);
    expect(pct('64 lines', 2.5, 4, 40)).toBeGreaterThan(45); expect(pct('64 lines', 2.5, 4, 40)).toBeLessThan(60);
    expect(pct('16 lines', 2.5, 4)).toBe(75);
    expect((4000 * Math.tan((2 * Math.PI) / 180)).toFixed(0)).toBe('140');
  });
  it('the earlier hole finder, on the same placements', () => {
    const old = (json('old_method.json') as { rows: { lidar: string; distance: [number, number]; usable: number; centre_err_mm: number[] }[] }).rows;
    const o = (l: string, a: number) => old.find((r) => r.lidar === l && r.distance[0] === a)!;
    expect([o('16 lines', 1.5).usable, o('16 lines', 2.5).usable, o('32 lines', 1.5).usable, o('32 lines', 2.5).usable]).toEqual([0, 0, 33, 0]);
    expect(flat).toContain('On the 16-line pattern it found the four holes in 0 of 200 placements. On 32 lines, in 33 of 200 at 1.5 to 2.5 m and in none at 2.5 to 4 m.');
    expect(median(o('dense', 1.5).centre_err_mm).toFixed(0)).toBe('6');
    expect(flat).toContain(`the centers were off by about 6 mm against ${median(cell('dense', 1.5, 2.5).centre_err_mm).toFixed(1)} mm now`);
  });
});

describe('calibrations', () => {
  it('100 runs per case, all solved', () => {
    expect(Object.keys(C)).toHaveLength(21);
    for (const v of Object.values(C)) { expect(v).toHaveLength(100); expect(v.every((r) => r.used >= 2)).toBe(true); }
  });
  it('table: number of placements', () => {
    expect(tableAfter('## How many placements, and where', 'Placements')).toEqual([[3, 'placements_3'], [6, 'placements_6'], [10, 'baseline'], [20, 'placements_20']].map(([n, c]) => [String(n), rot(c as string), tr(c as string), far(c as string)]));
  });
  it('table: where the placements are', () => {
    const rows = tableAfter('## How many placements, and where', 'Where the ten placements are');
    expect(rows.map((r) => r.slice(1))).toEqual(['baseline', 'near_only', 'far_only', 'out_to_8m', 'middle_of_view', 'facing_only'].map((c) => [rot(c), tr(c), far(c)]));
  });
  it('table: LiDAR pattern', () => {
    const rows = tableAfter('## What moves the result', 'LiDAR pattern, ten placements');
    expect(rows).toEqual([['16 lines', 'lidar_16'], ['32 lines', 'lidar_32'], ['64 lines', 'baseline'], ['128 lines', 'lidar_128'], ['Dense cloud', 'lidar_dense']].map(([l, c]) => [l, String(median(ok(c).map((r) => r.used))), rot(c), tr(c), far(c)]));
    const fars = ['lidar_16', 'lidar_32', 'baseline', 'lidar_128', 'lidar_dense'].map((c) => median(ok(c).map((r) => r.at_20m_mm)));
    expect([Math.min(...fars).toFixed(0), Math.max(...fars).toFixed(0)]).toEqual(['13', '19']);
    expect(flat).toContain('all landed between 13 and 19 mm at 20 m');
  });
  it('table: what moves the result', () => {
    const rows = tableAfter('## What moves the result', 'Change, 64 lines');
    expect(rows.map((r) => r.slice(1))).toEqual(['baseline', 'marker_noise_0.1px', 'marker_noise_1px', 'focal_plus_0.5pct', 'range_noise_10mm', 'range_noise_20mm', 'range_bias_20mm', 'panel_bowed_3mm'].map((c) => [rot(c), tr(c), far(c)]));
  });
  it('table: residuals', () => {
    expect(tableAfter('## What the residual tells you', 'Case').map((r) => r.slice(1))).toEqual(['baseline', 'range_bias_20mm', 'focal_plus_0.5pct', 'symmetric_layout'].map((c) => [fit(c), held(c), tr(c)]));
    const s = json('symmetric.json') as { placements: number; usable: number; turned_180: number };
    expect(flat).toContain(`the fit came back turned around in ${s.turned_180} of ${s.usable} placements`);
    expect(front).toContain(`turned by 180° in ${s.turned_180} of ${s.usable} placements`);
    expect(front).toContain(`The fit residual went from ${fit('baseline')} to ${fit('symmetric_layout')}`);
  });
  it('short answer, key rule and FAQ', () => {
    expect(flat).toContain(`Three gave ${far('placements_3')} at 20 m, six gave ${far('placements_6')}, twenty gave ${far('placements_20')}.`);
    expect(flat).toContain(`Marker corners good to 0.1 px: ${far('marker_noise_0.1px')} at 20 m. Good to 1 px: ${far('marker_noise_1px')}.`);
    expect(flat).toContain(`20 mm of offset, ${tr('range_bias_20mm')} of translation error.`);
    expect(front).toContain(`3 placements left a point 20 m ahead off by ${far('placements_3')}, 6 placements by ${far('placements_6')}, 10 by ${far('baseline')} and 20 by ${far('placements_20')}`);
    expect(front).toContain(`gave ${rot('baseline')} and ${tr('baseline')}, or ${far('baseline')} at 20 m`);
    expect(front).toContain(`a 20 mm range offset moved the translation by ${tr('range_bias_20mm')}`);
    expect(flat).toContain(`The simulation gives ${rot('baseline')} and ${tr('baseline')}.`);
    for (const c of ['lidar_32', 'baseline', 'lidar_128', 'lidar_dense']) { expect(median(ok(c).map((r) => r.rot_deg))).toBeLessThan(0.065); expect(median(ok(c).map((r) => r.trans_mm))).toBeLessThan(3.05); }
  });
});

describe('code in the guide', () => {
  const blocks = [...body.matchAll(/```(\w+)\n([\s\S]*?)```/g)];
  const py = blocks.filter(([, l]) => l === 'python').map(([, , t]) => t);
  const pipeline = readFileSync(`${DIR}/pipeline.py`, 'utf8'), rig = readFileSync(`${DIR}/calibrate_rig.py`, 'utf8'), tryIt = readFileSync(`${DIR}/try_holes.py`, 'utf8');
  it('every block is part of a script that was run', () => {
    expect(py).toHaveLength(7);
    const tryCode = tryIt.slice(tryIt.indexOf('import numpy'));
    for (const b of py) expect(pipeline.includes(b) || rig.includes(b) || b === tryCode).toBe(true);
    expect(py.filter((b) => pipeline.includes(b)).join('').length).toBeGreaterThan(0.95 * pipeline.slice(pipeline.indexOf('import cv2')).length - 10);
  });
  it('printed output is the saved output', () => {
    for (const f of ['end_to_end.txt', 'try_holes.txt']) expect(blocks.some(([, l, t]) => l === 'text' && t === readFileSync(`${DIR}/results/${f}`, 'utf8'))).toBe(true);
  });
  it('the end-to-end result against the truth', () => {
    const e = json('end_to_end.json') as { rotation_error_deg: number; translation_error_mm: number; at_20m_mm: number };
    expect(flat).toContain(`That is ${e.rotation_error_deg.toFixed(2)}° and ${fmtMm(e.translation_error_mm)} mm from the transform the simulation was built with, or ${e.at_20m_mm.toFixed(0)} mm at 20 m.`);
  });
  it('corner refinement on ten rendered sets', () => {
    const m = (json('corner_refinement.json') as { methods: Record<string, { trans_mm: number; at_20m_mm: number }[]> }).methods;
    const range = (k: string) => [Math.min(...m[k].map((r) => r.at_20m_mm)).toFixed(0), Math.max(...m[k].map((r) => r.at_20m_mm)).toFixed(0)];
    expect(flat).toContain(`the default detector left the calibration between ${range('none (the default)').join(' and ')} mm off at 20 m. With AprilTag refinement the same images gave ${range('apriltag').join(' to ')} mm, and the median translation error fell from ${fmtMm(median(m['none (the default)'].map((r) => r.trans_mm)))} mm to ${fmtMm(median(m.apriltag.map((r) => r.trans_mm)))} mm.`);
  });
});

describe('first figure', () => {
  it('is the file this code writes from the saved placements', () => {
    expect(readFileSync('src/assets/guides/lidar-holes-found-by-distance.svg', 'utf8')).toBe(lidarUsableFigureSvg(det));
  });
  it('its alt text carries the same percentages', () => {
    const p = (l: string) => LIDAR_FIGURE_DISTANCES.map(([a, b]) => Math.round((100 * cell(l, a, b).usable) / 200)).join(', ');
    expect(body).toContain(`16 lines: ${p('16 lines')} %. 32 lines: ${p('32 lines')} %. 64 lines: ${p('64 lines')} %. 128 lines and the dense cloud: ${p('128 lines')} %.`);
    expect(p('dense')).toBe(p('128 lines'));
  });
});
