import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { boardMotionFigureSvg, boardMotionRowsFromGuide, BOARD_MOTION_SCALE } from './guideFigures';

const DIR = 'docs/content/experiments/board-motion';
const md = readFileSync('src/content/guides/how-still-calibration-board.md', 'utf8');
const rows = boardMotionRowsFromGuide(md);

type Session = { rms: number; lens: number; lens_max: number; dpp: number; top2: boolean | number; flagged_hit: number; flagged_extra: number; usable_bad: number; rms_wo: number; lens_wo: number; dpp_wo: number; shear_px: number };
const table = JSON.parse(readFileSync(`${DIR}/results/table.json`, 'utf8')) as Record<string, Session[]>;
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const med = (name: string, k: keyof Session) => median(table[name].map((r) => Number(r[k])));
const sum = (name: string, k: keyof Session) => table[name].reduce((a, r) => a + Number(r[k]), 0);

/** Guide row label → case name in table.py. */
const CASES: [string, string][] = [
  ['held still', 'still'],
  ['global, 4 mm, steady speed', 'global 4 mm, even'],
  ['global, 4 mm, changing speed', 'global 4 mm, uneven'],
  ['rolling, 0.25 mm sideways', 'rolling 0.25 mm sideways'],
  ['rolling, 0.5 mm sideways', 'rolling 0.5 mm sideways'],
  ['rolling, 1 mm sideways', 'rolling 1 mm sideways'],
  ['rolling, 2 mm sideways', 'rolling 2 mm sideways'],
  ['rolling, 4 mm sideways', 'rolling 4 mm sideways'],
  ['rolling, 2 mm up or down', 'rolling 2 mm up or down'],
  ['rolling, 4 mm toward the camera', 'rolling 4 mm along the view'],
  ['rolling, board turns 0.5°', 'rolling 0.5 deg turn'],
];

describe('board-motion guide: every number in the table is the median of the saved sessions', () => {
  it('has one row per case, in the order of the experiment', () => {
    expect(rows.map((r) => r.label)).toEqual(CASES.map((c) => c[0]));
    expect(Object.keys(table)).toEqual(CASES.map((c) => c[1]));
  });
  it.each(CASES)('%s', (label, name) => {
    const r = rows.find((x) => x.label === label)!;
    expect(r.rms.toFixed(3)).toBe(med(name, 'rms').toFixed(3));
    expect(r.lensMean.toFixed(2)).toBe(med(name, 'lens').toFixed(2));
    expect(r.lensMax.toFixed(2)).toBe(med(name, 'lens_max').toFixed(2));
    expect(r.principalPoint.toFixed(1)).toBe(med(name, 'dpp').toFixed(1));
    expect(r.tallest).toBe(table[name].filter((s) => s.top2).length);
    expect(r.sessions).toBe(table[name].length);
    expect(r.sessions).toBe(20);
  });
});

describe('board-motion guide: sentences that quote the results', () => {
  it('3x-median rule counts and no still image flagged', () => {
    expect(sum('rolling 2 mm sideways', 'flagged_hit')).toBe(37);
    expect(sum('rolling 1 mm sideways', 'flagged_hit')).toBe(24);
    expect(sum('rolling 0.5 mm sideways', 'flagged_hit')).toBe(10);
    expect(md).toContain('caught 37 of the 40 moving images at 2 mm, 24 of 40 at 1 mm and 10 of 40 at 0.5 mm');
    for (const name of Object.keys(table)) expect(sum(name, 'flagged_extra')).toBe(0);
    expect(md).toContain('It never flagged a still image');
  });
  it('four blurred images were not detected', () => {
    expect(40 - sum('global 4 mm, even', 'usable_bad')).toBe(4);
    expect(md).toContain('Four of our 40 smeared images were not detected');
  });
  it('removing the two images restores the still result in every case', () => {
    for (const name of Object.keys(table)) {
      expect(med(name, 'rms_wo')).toBeLessThan(0.05);
      expect(med(name, 'lens_wo')).toBeLessThan(0.035);
      expect(med(name, 'dpp_wo')).toBeLessThan(0.25);
    }
  });
  it('pixels per millimeter and the 5 px shear', () => {
    const pxPerMm = med('still', 'shear_px');
    expect(pxPerMm.toFixed(1)).toBe('2.4');
    expect(Math.round(2 * pxPerMm)).toBe(5);
    expect(md).toContain('1 mm is about 2.4 px');
  });
  it('all images moving, checkerboard, larger board, band count', () => {
    const harder = JSON.parse(readFileSync(`${DIR}/results/harder_cases.json`, 'utf8')) as Record<string, { rows: Record<string, number>[] }>;
    const all1 = harder['all images move up to 1.0 mm'].rows;
    expect(median(all1.map((r) => r.rms)).toFixed(3)).toBe('0.118');
    expect(median(all1.map((r) => Math.hypot(r.dcx, r.dcy))).toFixed(1)).toBe('2.5');
    expect(md).toContain('the RMS was 0.118 px and the principal point was off by 2.5 px');
    const checker = harder['checkerboard 10x7, 30 mm'].rows;
    expect([checker.filter((r) => r.top2).length, checker.length]).toEqual([3, 6]);
    expect(md).toContain('in only 3 of 6');
    const bands = JSON.parse(readFileSync(`${DIR}/results/bands.json`, 'utf8')) as { name: string; rms: number }[];
    expect(bands.filter((b) => /bands=/.test(b.name)).map((b) => b.rms.toFixed(3))).toEqual(['0.117', '0.111', '0.111', '0.111']);
    expect(md).toContain('48, 240 and 960 bands all give an RMS of 0.111 px against 0.117 px for 12');
  });
  it('readout arithmetic', () => {
    expect(Math.round(0.25 / 0.03)).toBe(8);
    expect(Math.round(2 / 0.03)).toBe(67);
    expect(2 / 0.01).toBe(200);
    expect(Math.round(1 / 0.03)).toBe(33);
    expect((2 * Math.atan(640 / 1500) * 180 / Math.PI).toFixed(0)).toBe('46');
  });
});

describe('board-motion guide: the published script is the one that was run', () => {
  const block = (lang: string) => md.match(new RegExp('```' + lang + '\\n([\\s\\S]*?)```'))![1];
  it('python block equals board_motion.py', () => {
    expect(block('python')).toBe(readFileSync(`${DIR}/board_motion.py`, 'utf8'));
  });
  it('output block equals the saved output', () => {
    expect(block('text')).toBe(readFileSync(`${DIR}/results/board_motion.txt`, 'utf8'));
  });
  it('200-seed sweep figures quoted under the output', () => {
    const sweep = readFileSync(`${DIR}/results/board_motion_sweep.txt`, 'utf8');
    expect(sweep).toMatch(/shift 2\.00 mm: .*principal point off 1\.26 \(90th pct 3\.31\)/);
    expect(md).toContain('the median over 200 seeds is 1.3 px and nine in ten stay under 3.3 px');
    expect(Math.hypot(646.1 - 640, 483.3 - 480).toFixed(0)).toBe('7');
  });
});

describe('board-motion figure', () => {
  it('is the file this code writes', () => {
    expect(readFileSync('src/assets/guides/board-motion-rms-vs-model-error.svg', 'utf8')).toBe(boardMotionFigureSvg(rows));
  });
  it('no bar is clipped by the scale', () => {
    for (const r of rows) { expect(r.rms).toBeLessThanOrEqual(BOARD_MOTION_SCALE.rmsMax); expect(r.lensMax).toBeLessThanOrEqual(BOARD_MOTION_SCALE.lensMax); }
  });
});
