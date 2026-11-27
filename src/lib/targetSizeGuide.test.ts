import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { boardPlacementFigureSvg, fmtPx, type PlacementData } from './guideFigures';

/**
 * Every number in the target-size guide comes from the saved runs in docs/content/experiments/target-size/.
 * Tables and figures in the text are recomputed here from the per-session and per-step results, so a number
 * changed by hand in the guide fails.
 */
const DIR = 'docs/content/experiments/target-size';
const md = readFileSync('src/content/guides/calibration-target-size.md', 'utf8');
const front = md.slice(0, md.indexOf('---', 4));
const body = md.slice(md.indexOf('---', 4) + 3);
const flat = body.replace(/\s+/g, ' ');

type Solve = { rms: number; model_mean: number; model_worst: number; focal_err_pct: number } | null;
type Session = { session: number; views: number; corners: number; frame_cells_reached: number; default: Solve; fewer: Solve };
type Arm = { fill: number; place: string; tilt_deg: [number, number]; board: [number, number]; px_per_square: number };
const saved = JSON.parse(readFileSync(`${DIR}/results/sessions.json`, 'utf8')) as { image: [number, number]; arms: Record<string, Arm>; results: Record<string, Session[]> };
type PxRow = { px_per_square: number; px_per_marker_bit: number; markers_found: number; markers_total: number; corners_found: number; corners_total: number; err_median: number | null };
const pixels = (JSON.parse(readFileSync(`${DIR}/results/pixels.json`, 'utf8')) as { rows: PxRow[] }).rows;

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const arm = (name: string) => saved.results[name];
const solved = (name: string, which: 'default' | 'fewer' = 'default') => { const ok = arm(name).map((s) => s[which]!); expect(ok.every(Boolean)).toBe(true); return ok; };
const worst = (name: string, which: 'default' | 'fewer' = 'default') => fmtPx(median(solved(name, which).map((o) => o.model_worst)));
const worstSession = (name: string) => fmtPx(Math.max(...solved(name).map((o) => o.model_worst)));
const rms = (name: string) => median(solved(name).map((o) => o.rms)).toFixed(3);
const cells = (name: string) => String(median(arm(name).map((s) => s.frame_cells_reached)));

/** Rows of the markdown table whose header starts with the given cell. */
function table(firstHeader: string): string[][] {
  const lines = body.split('\n'); const i = lines.findIndex((l) => l.startsWith(`| ${firstHeader} |`));
  expect(i).toBeGreaterThan(-1);
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  return rows;
}
const tablesStarting = (h: string) => body.split('\n').map((l, i, a) => (l.startsWith(`| ${h} |`) ? i : -1)).filter((i) => i >= 0);

describe('saved runs', () => {
  it('15 cases of 20 sessions of 20 images', () => {
    expect(Object.keys(saved.results)).toHaveLength(15);
    for (const [name, v] of Object.entries(saved.results)) {
      expect(v).toHaveLength(20);
      if (name !== 'dense_30') expect(v.reduce((a, s) => a + s.views, 0)).toBeGreaterThanOrEqual(399); // one image of spread_20 had too few corners
    }
  });
});

describe('table: the board moved around the frame', () => {
  const FILLS = [20, 30, 45, 60, 80];
  const lines = body.split('\n'); const start = tablesStarting('Board width in the frame')[0];
  const rows = lines.slice(start + 2, start + 2 + FILLS.length).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  it.each(FILLS.map((f, i) => [f, i] as const))('%i %%', (f, i) => {
    const n = `spread_${f}`;
    expect(saved.arms[n]).toMatchObject({ fill: f / 100, place: 'spread', board: [14, 9] });
    expect(rows[i]).toEqual([`${f} %`, String(Math.round(saved.arms[n].px_per_square)), cells(n), rms(n), worst(n), worstSession(n)]);
  });
});

describe('table: the board held in the middle', () => {
  const FILLS = [20, 30, 45, 60];
  const lines = body.split('\n'); const start = tablesStarting('Board width in the frame')[1];
  const rows = lines.slice(start + 2, start + 2 + FILLS.length).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  it.each(FILLS.map((f, i) => [f, i] as const))('%i %%', (f, i) => {
    const n = `centre_${f}`;
    expect(saved.arms[n]).toMatchObject({ fill: f / 100, place: 'centre' });
    expect(rows[i]).toEqual([`${f} %`, cells(n), rms(n), worst(n), worst(n, 'fewer')]);
  });
  it('the reprojection error is no worse than with the board moved around', () => {
    for (const f of FILLS) expect(+rms(`centre_${f}`)).toBeLessThanOrEqual(+rms(`spread_${f}`));
  });
});

describe('table: a board bigger than the image', () => {
  const lines = body.split('\n'); const start = tablesStarting('Board width in the frame')[2];
  const rows = lines.slice(start + 2, start + 5).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  it('rows', () => {
    expect(rows).toEqual([
      ['60 %', worst('spread_60'), worst('overhang_60')],
      ['80 %', worst('spread_80'), worst('overhang_80')],
      ['100 %', 'does not fit tilted', worst('overhang_100')],
    ]);
  });
  it('the widest board is the best case of all, and reaches 47 or 48 cells every time', () => {
    const all = Object.keys(saved.results).filter((n) => n !== 'dense_30').map((n) => median(solved(n).map((o) => o.model_worst)));
    expect(Math.min(...all)).toBe(median(solved('overhang_100').map((o) => o.model_worst)));
    expect(Math.min(...arm('overhang_100').map((s) => s.frame_cells_reached))).toBe(47);
    expect(flat).toContain('Its corners reached 47 or all 48 cells of the frame in every session.');
  });
});

describe('table: how small the squares can get', () => {
  const rows = table('Pixels per square');
  const pct = (a: number, b: number) => `${Math.round((100 * a) / b)} %`;
  it('six steps from the saved sweep', () => {
    expect(rows).toEqual(pixels.slice(0, 6).map((r) => [String(r.px_per_square), r.px_per_marker_bit.toFixed(1), pct(r.markers_found, r.markers_total), pct(r.corners_found, r.corners_total), r.err_median === null ? 'none' : r.err_median.toFixed(2)]));
  });
  it('nothing is found at smaller sizes', () => {
    for (const r of pixels.slice(5)) expect(r.corners_found).toBe(0);
  });
  it('the FAQ and the list of old claims quote the table', () => {
    const at = (px: number) => pixels.find((r) => r.px_per_square === px)!;
    expect(front).toContain(`decoded ${pct(at(33).markers_found, at(33).markers_total)} of the markers at 33 px per square (${at(33).px_per_marker_bit.toFixed(1)} px per marker bit), ${pct(at(27).markers_found, at(27).markers_total)} at 27 px and ${pct(at(23).markers_found, at(23).markers_total)} at 23 px. Below 20 px it found nothing.`);
    expect(at(18).markers_found + at(16).markers_found).toBe(0);
    expect(flat).toContain(`At 27 px per square ${100 - Math.round((100 * at(27).corners_found) / at(27).corners_total)} % of the corners were already lost.`);
  });
});

describe('numbers in the text', () => {
  it('opening, short answer and FAQ', () => {
    expect(flat).toContain(`The camera model is not: ${worst('centre_20')} px off at its worst pixel in one case, ${worst('spread_20')} px in the other.`);
    expect(flat).toContain(`the model came out within ${worst('spread_60')} px.`);
    expect(flat).toContain(`80 % gave ${worst('spread_80')} px. A ChArUco board as wide as the frame, partly outside it, gave ${worst('overhang_100')} px.`);
    expect(front).toContain(`held mid-frame the camera model was off by ${worst('centre_20')} px, moved around by ${worst('spread_20')} px`);
    expect(front).toContain(`within ${worst('spread_20')} px at 20 % of the frame width, ${worst('spread_60')} px at 60 % and ${worst('spread_80')} px at 80 %`);
    expect(front).toContain(`gave ${worst('centre_20')} px with OpenCV's standard model`);
    expect(front).toContain(`the reprojection error looked the same in both cases: ${rms('spread_20')} and ${rms('centre_20')} px`);
    expect(front).toContain(`the model was within ${worst('overhang_100')} px, the best result of the test`);
  });
  it('worst sessions and the middle of the frame at 60 %', () => {
    expect(flat).toContain(`its worst one was off by ${worstSession('spread_20')} px, against ${worstSession('spread_60')} px for the worst session at 60 %.`);
    expect(cells('centre_60')).toBe('24');
    expect(flat).toContain(`reaches half the cells, and the model is within ${worst('centre_60')} px`);
  });
  it('more squares', () => {
    expect(saved.arms.dense_60).toMatchObject({ fill: 0.6, board: [28, 18] });
    const t = `gave ${worst('dense_60')} px at the worst pixel against ${worst('spread_60')} px for the 14 × 9 board`;
    expect(flat).toContain(t);
    expect(front).toContain(`a 28 × 18 board gave ${worst('dense_60')} px against ${worst('spread_60')} px for a 14 × 9 board of the same size`);
    const d30 = arm('dense_30');
    expect([d30.length * 20, d30.reduce((a, s) => a + s.views, 0), d30.reduce((a, s) => a + s.corners, 0)]).toEqual([400, 1, 10]);
    expect(front).toContain('its marker bits were 1.9 px and 1 image in 400 was detected');
    expect(flat).toContain('the dense board was detected in 1 image of 400');
    expect(Math.round(saved.arms.dense_30.px_per_square)).toBe(21);
    expect(((saved.arms.dense_30.px_per_square * 0.75) / 8).toFixed(1)).toBe('1.9');
    expect(flat).toContain('had squares of 21 px and marker bits of 1.9 px. Of 400 images, 1 was detected, with 10 corners.');
  });
  it('less tilt', () => {
    expect(saved.arms.flat_60).toMatchObject({ fill: 0.6, tilt_deg: [0, 10] });
    const f = (n: string) => median(solved(n).map((o) => o.focal_err_pct)).toFixed(3);
    expect(flat).toContain(`the worst pixel was ${worst('flat_60')} px against ${worst('spread_60')} px, and the focal length error ${f('flat_60')} % against ${f('spread_60')} %`);
  });
  it('what we got wrong', () => {
    expect(flat).toContain(`Moved around the frame, the small board gives ${worst('spread_20')} px. Held in the middle, ${worst('centre_20')} px.`);
    expect(flat).toContain(`It kept going: ${worst('spread_60')} px at 60 %, ${worst('spread_80')} px at 80 %, ${worst('overhang_100')} px at 100 %.`);
    expect(flat).toContain(`We measured ${worst('dense_60')} px against ${worst('spread_60')} px, and at 1.9 px per marker bit the dense board`);
    expect(flat).toContain(`We measured ${worst('flat_60')} px against ${worst('spread_60')} px.`);
  });
  it('the sizing example', () => {
    const seen = (8.8 * 800) / 12;
    expect(flat).toContain(`sees ${seen.toFixed(0)} mm`);
    expect(flat).toContain(`0.6 × ${seen.toFixed(0)} = ${(0.6 * Math.round(seen)).toFixed(0)} mm`);
    const pxmm = 2448 / Math.round(seen);
    expect(flat).toContain(`2448 / ${seen.toFixed(0)} = ${pxmm.toFixed(1)} px per mm. A 15 mm marker is then ${(15 * pxmm).toFixed(0)} px wide, or ${((15 * pxmm) / 8).toFixed(1)} px per bit.`);
    for (const [, w, view] of body.matchAll(/^\| (\d+) × \d+ \| (\d+) mm wide \|/gm)) expect(Math.abs(+w / 0.6 - +view)).toBeLessThanOrEqual(5);
  });
});

describe('the script in the guide', () => {
  const blocks = [...body.matchAll(/```(\w+)\n([\s\S]*?)```/g)];
  it('is the saved script, and its two outputs are the saved outputs', () => {
    const script = readFileSync(`${DIR}/coverage.py`, 'utf8');
    const code = script.slice(script.indexOf('import sys'));
    expect(blocks.some(([, lang, text]) => lang === 'python' && text === code)).toBe(true);
    for (const f of ['coverage_moved.txt', 'coverage_middle.txt']) {
      const out = readFileSync(`${DIR}/results/${f}`, 'utf8');
      expect(blocks.some(([, lang, text]) => lang === 'text' && text === out)).toBe(true);
    }
  });
  it('the two sessions it was run on are session 0 of each case', () => {
    const cellsOf = (f: string) => +readFileSync(`${DIR}/results/${f}`, 'utf8').match(/with corners: (\d+) of 48/)![1];
    const rmsOf = (f: string) => readFileSync(`${DIR}/results/${f}`, 'utf8').match(/reprojection error ([\d.]+) px/)![1];
    expect(cellsOf('coverage_moved.txt')).toBe(arm('spread_20')[0].frame_cells_reached);
    expect(cellsOf('coverage_middle.txt')).toBe(arm('centre_20')[0].frame_cells_reached);
    expect(rmsOf('coverage_moved.txt')).toBe(arm('spread_20')[0].default!.rms.toFixed(3));
    expect(rmsOf('coverage_middle.txt')).toBe(arm('centre_20')[0].default!.rms.toFixed(3));
    expect(flat).toContain(`Its camera model was off by ${fmtPx(arm('centre_20')[0].default!.model_worst)} px at the worst pixel; the first session's by ${fmtPx(arm('spread_20')[0].default!.model_worst)} px.`);
  });
});

describe('first figure', () => {
  const data = JSON.parse(readFileSync('src/data/target-size-placement.json', 'utf8')) as PlacementData;
  it('is the file this code writes', () => {
    expect(readFileSync('src/assets/guides/board-middle-vs-moved.svg', 'utf8')).toBe(boardPlacementFigureSvg(data));
  });
  it('carries the medians of the saved sessions', () => {
    for (const [key, name] of [['middle', 'centre_20'], ['moved', 'spread_20']] as const) {
      const c = data.cases.find((x) => x.key === key)!;
      expect(c.arm).toBe(name); expect(c.outlines).toHaveLength(20);
      expect(c.rms.toFixed(3)).toBe(rms(name)); expect(fmtPx(c.model_worst)).toBe(worst(name));
    }
    expect(body).toContain(`Held in the middle: reprojection error ${rms('centre_20')} px, camera model off by ${worst('centre_20')} px. Moved around the frame: reprojection error ${rms('spread_20')} px, camera model off by ${worst('spread_20')} px.`);
  });
  it('the board held in the middle stays in the middle', () => {
    const [w, h] = data.image;
    for (const q of data.cases.find((x) => x.key === 'middle')!.outlines) {
      const cx = q.reduce((a, p) => a + p[0], 0) / 4, cy = q.reduce((a, p) => a + p[1], 0) / 4;
      expect(Math.abs(cx - w / 2)).toBeLessThan(0.1 * w); expect(Math.abs(cy - h / 2)).toBeLessThan(0.1 * h);
    }
  });
});
