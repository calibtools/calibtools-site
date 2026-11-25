import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Every number in the pattern-choice guide comes from the saved runs in docs/content/experiments/target-choice/.
 * The tables are read from the guide and recomputed here from the per-session results, not from the summary
 * the scripts print, so a number changed by hand in either place fails.
 */
const DIR = 'docs/content/experiments/target-choice';
const md = readFileSync('src/content/guides/charuco-vs-checkerboard-vs-aprilgrid.md', 'utf8');
const body = md.slice(md.indexOf('---', 4) + 3);

type Run = { board: string; plan: string; solved: boolean; views_used: number; points: number; coverage: number; rms?: number; model_mean?: number; model_max?: number };
const runs = (JSON.parse(readFileSync(`${DIR}/results/models.json`, 'utf8')) as { runs: Run[] }).runs;
type Acc = { method: string; condition: string; views_detected: number; views_complete: number; points_found: number; rms_px: number; over_1px: number };
const acc = (JSON.parse(readFileSync(`${DIR}/results/accuracy.json`, 'utf8')) as { rows: Acc[] }).rows;

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const of = (board: string, plan: string) => runs.filter((r) => r.board === board && r.plan === plan);
const med = (board: string, plan: string, k: keyof Run, solvedOnly = true) => median(of(board, plan).filter((r) => !solvedOnly || r.solved).map((r) => Number(r[k])));

/** Rows of every markdown table whose header starts with the given cell. */
function tables(firstHeader: string): string[][][] {
  const out: string[][][] = []; const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith(`| ${firstHeader} |`)) continue;
    const rows: string[][] = [];
    for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
    out.push(rows);
  }
  return out;
}

const SESSION_ROWS: [table: number, label: string, board: string, plan: string][] = [
  [0, 'Checkerboard', 'checkerboard', 'inside'], [0, 'ChArUco', 'charuco', 'inside'], [0, 'AprilGrid', 'aprilgrid', 'inside'],
  [0, 'Circle grid', 'circles', 'inside'], [0, 'Asymmetric circle grid', 'asym_circles', 'inside'],
  [1, 'Checkerboard', 'checkerboard', 'edges'], [1, 'ChArUco', 'charuco', 'edges'], [1, 'AprilGrid', 'aprilgrid', 'edges'],
  [1, 'Circle grid', 'circles', 'edges'], [1, 'Asymmetric circle grid', 'asym_circles', 'edges'],
  [2, 'Edges fitted with a line', 'aprilgrid', 'inside'], [2, 'OpenCV, `CORNER_REFINE_SUBPIX`', 'aprilgrid_cv_subpix', 'inside'], [2, 'OpenCV, no refinement', 'aprilgrid_cv_none', 'inside'],
];

describe('session tables: each cell is the median of the 20 saved sessions', () => {
  const t = [...tables('Pattern'), ...tables('Tag corners from')].filter((rows) => rows[0].length === 8);

  it('three tables of 5, 5 and 3 rows; 20 sessions behind every row', () => {
    expect(t.map((rows) => rows.length)).toEqual([5, 5, 3]);
    for (const [, , board, plan] of SESSION_ROWS) expect(of(board, plan), `${board} ${plan}`).toHaveLength(20);
  });

  it.each(SESSION_ROWS)('table %i, %s', (ti, label, board, plan) => {
    const row = t[ti].find((r) => r[0] === label)!;
    const all = of(board, plan), ok = all.filter((r) => r.solved);
    expect(row.slice(1)).toEqual([
      `${ok.length}/20`,
      String(med(board, plan, 'views_used', false)),
      `${(med(board, plan, 'coverage', false) * 100).toFixed(0)} %`,
      med(board, plan, 'rms').toFixed(3),
      med(board, plan, 'model_mean').toFixed(3),
      med(board, plan, 'model_max').toFixed(3),
      Math.max(...ok.map((r) => r.model_max!)).toFixed(2),
    ]);
  });
});

describe('point table: RMS distance from the saved runs', () => {
  const METHODS: [string, string][] = [
    ['Checkerboard, `findChessboardCorners` + `cornerSubPix`', 'checkerboard_classic'], ['Checkerboard, `findChessboardCornersSB`', 'checkerboard_sb'],
    ['ChArUco, `CharucoDetector`', 'charuco'], ['AprilGrid, edges fitted with a line', 'aprilgrid_edges'],
    ['AprilGrid, OpenCV `CORNER_REFINE_SUBPIX`', 'aprilgrid_subpix'], ['AprilGrid, OpenCV no refinement', 'aprilgrid_none'],
    ['Circle grid, `findCirclesGrid`', 'circles'], ['Asymmetric circle grid, `findCirclesGrid`', 'asym_circles'],
  ];
  const rows = tables('Pattern and detector')[0];
  it('has the eight rows', () => expect(rows.map((r) => r[0])).toEqual(METHODS.map((m) => m[0])));
  it.each(METHODS)('%s', (label, method) => {
    const row = rows.find((r) => r[0] === label)!;
    const cell = (c: string) => acc.find((r) => r.method === method && r.condition === c)!.rms_px.toFixed(3);
    expect(row.slice(1)).toEqual(['standard', 'soft_focus', 'small', 'steep', 'noisy'].map(cell));
  });
});

describe('numbers quoted in the text', () => {
  const a = (method: string, condition = 'standard') => acc.find((r) => r.method === method && r.condition === condition)!;
  const says = (text: string) => expect(body, text).toContain(text);

  it('all five patterns within 0.11 px with the whole board in view', () => {
    const worst = ['checkerboard', 'charuco', 'aprilgrid', 'circles', 'asym_circles'].map((b) => med(b, 'inside', 'model_max'));
    expect(Math.max(...worst)).toBeLessThan(0.11);
    expect(Math.min(...worst).toFixed(2)).toBe('0.03');
    says('within 0.11 px'); says('between 0.03 and 0.11 px');
  });

  it('views that survive when the board may be cut off', () => {
    expect([med('charuco', 'edges', 'views_used', false), med('aprilgrid', 'edges', 'views_used', false)]).toEqual([24, 24]);
    expect(med('checkerboard', 'edges', 'views_used', false)).toBe(7.5);
    expect([med('circles', 'edges', 'views_used', false), med('asym_circles', 'edges', 'views_used', false)]).toEqual([3.5, 4.5]);
    expect([of('circles', 'edges').filter((r) => r.solved).length, of('asym_circles', 'edges').filter((r) => r.solved).length]).toEqual([10, 14]);
    says('The checkerboard kept 7.5 and the circle grids 3.5 to 4.5. The circle grid solved in 10 of 20 sessions and the asymmetric one in 14.');
    expect(Math.max(...of('checkerboard', 'edges').map((r) => r.model_max!)).toFixed(1)).toBe('5.5');
    says('one checkerboard session ended 5.5 px off');
  });

  it('going over the edge: more coverage, fewer points, no better model', () => {
    expect([med('charuco', 'inside', 'model_max').toFixed(3), med('charuco', 'edges', 'model_max').toFixed(3)]).toEqual(['0.106', '0.132']);
    expect([med('aprilgrid', 'inside', 'model_max').toFixed(3), med('aprilgrid', 'edges', 'model_max').toFixed(3)]).toEqual(['0.033', '0.055']);
    expect([med('charuco', 'edges', 'points', false), med('charuco', 'inside', 'points', false)]).toEqual([904, 1296]);
    expect((med('charuco', 'inside', 'coverage', false) * 100).toFixed(0)).toBe('85');
    says('from 0.106 to 0.132 px'); says('from 0.033 to 0.055 px'); says('904 points a session instead of 1296'); says('instead of 85 %');
  });

  it('tag corners: 1.3 to 1.9 px against 0.03 px, about 40 times', () => {
    const good = med('aprilgrid', 'inside', 'model_max'), subpix = med('aprilgrid_cv_subpix', 'inside', 'model_max'), none = med('aprilgrid_cv_none', 'inside', 'model_max');
    expect([subpix.toFixed(1), none.toFixed(1), good.toFixed(2)]).toEqual(['1.3', '1.9', '0.03']);
    expect(Math.round(subpix / good / 10) * 10).toBe(40);
    expect([med('aprilgrid_cv_subpix', 'inside', 'rms').toFixed(2), med('aprilgrid', 'inside', 'rms').toFixed(2)]).toEqual(['0.29', '0.03']);
    says('1.3 to 1.9 px off'); says('about 40 times worse'); says('0.29 px instead of 0.03');
  });

  it('detectors: checkerboard, circles, ChArUco in soft focus', () => {
    expect([a('checkerboard_sb').rms_px.toFixed(3), a('checkerboard_classic').rms_px.toFixed(3)]).toEqual(['0.117', '0.024']);
    for (const c of ['standard', 'soft_focus', 'small', 'steep', 'noisy']) expect(a('checkerboard_sb', c).rms_px).toBeGreaterThan(a('checkerboard_classic', c).rms_px);
    expect([a('circles').rms_px.toFixed(2), a('circles', 'small').rms_px.toFixed(2), a('circles', 'noisy').rms_px.toFixed(2)]).toEqual(['0.13', '0.02', '0.13']);
    expect([med('circles', 'inside', 'rms').toFixed(3), med('asym_circles', 'inside', 'rms').toFixed(3)]).toEqual(['0.011', '0.008']);
    expect(med('circles', 'inside', 'model_max')).toBeLessThanOrEqual(0.0805);
    const soft = a('charuco', 'soft_focus');
    expect([soft.views_detected, soft.views_complete, soft.points_found, a('charuco').points_found]).toEqual([60, 0, 2646, 3240]);
    expect(soft.rms_px).toBeLessThan(0.08);
    expect([a('aprilgrid_edges').rms_px.toFixed(3), a('asym_circles', 'small').rms_px.toFixed(2)]).toEqual(['0.029', '0.02']);
    says('0.117 px against 0.024 px'); says('2646 corners instead of 3240'); says('0.008 to 0.011 px');
  });

  it('the FAQ repeats the same figures', () => {
    expect(a('charuco').rms_px.toFixed(3)).toBe('0.048');
    for (const t of ['within 0.024 px', 'within 0.048 px', 'kept 7.5', '1.3 px off at the worst pixel', 'it was 0.03 px', '0.13 px from the true center', 'within 0.08 px']) expect(md).toContain(t);
  });
});

describe('the script in the guide', () => {
  const blocks = [...body.matchAll(/```(\w+)\n([\s\S]*?)\n```/g)].map((m) => [m[1], m[2]]);
  it('is the file in the experiment folder, word for word', () => {
    expect(blocks[0]).toEqual(['python', readFileSync(`${DIR}/tag_corners.py`, 'utf8').trimEnd()]);
  });
  it('and its output is the saved output', () => {
    const out = readFileSync(`${DIR}/results/tag_corners.txt`, 'utf8').trimEnd();
    expect(blocks[1]).toEqual(['text', out]);
    expect(out).toMatch(/CORNER_REFINE_APRILTAG 3840 corners {3}RMS 0\.70 px {3}mean shift \(\+0\.48, \+0\.49\) px {3}RMS without the shift 0\.14 px/);
  });
});

describe('house rules for a guide', () => {
  it('no em dash in the text, and it says it is a simulation near the top and at the end', () => {
    expect(body).not.toContain('—');
    expect(body.slice(0, 1200)).toContain('not from a real camera');
    expect(body).toContain('## What this test is not');
  });
});
