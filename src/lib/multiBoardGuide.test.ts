import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sameIdsFigureSvg, type SameIdsData } from './guideFigures';

/**
 * Every number in the multi-board guide comes from the saved runs in docs/content/experiments/multi-board/.
 * Tables and figures in the text are recomputed here from the per-session and per-view results, so a number
 * changed by hand in the guide or in a summary fails.
 */
const DIR = 'docs/content/experiments/multi-board';
const md = readFileSync('src/content/guides/multi-board-marker-ids.md', 'utf8');
const front = md.slice(0, md.indexOf('---', 4));
const body = md.slice(md.indexOf('---', 4) + 3);
const flat = body.replace(/\s+/g, ' ');

type Solve = { rms: number; model_mean: number; model_worst: number; views: number; failed?: boolean } | null;
type Arm = { views_kept: number; corners: number; views_with_wrong: number; worst_off: number | null; board1: Solve };
type Session = { distinct_check: Arm; same_check: Arm; same_nocheck: Arm; distinct_both: { views: number; rms: number; model_mean: number; model_worst: number } };
const sessions = (JSON.parse(readFileSync(`${DIR}/results/sessions.json`, 'utf8')) as { sessions: Session[] }).sessions;
type Dup = { repeated: number; corners_default: number; corners_check_off: number; wrong_check_off: number };
const dups = (JSON.parse(readFileSync(`${DIR}/results/duplicates.json`, 'utf8')) as { views: Dup[] }).views;
type Reach = { markers: number; rows: { marker_px: number; decoded: number; wrong: number; total: number }[] };
const reach = (JSON.parse(readFileSync(`${DIR}/results/reach.json`, 'utf8')) as { dictionaries: Record<string, Reach> }).dictionaries;
const dictsTxt = readFileSync(`${DIR}/results/dicts.txt`, 'utf8');
const versionsTxt = readFileSync(`${DIR}/results/versions.txt`, 'utf8');

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(v));

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

describe('session table: medians of the 20 saved sessions', () => {
  const rows = tables('Rig')[0];
  it('20 sessions, four rows', () => {
    expect(sessions).toHaveLength(20);
    expect(rows.map((r) => r[0])).toEqual(['Separate IDs, board 1', 'Separate IDs, both boards', 'Same IDs, OpenCV 4.8 and later', 'Same IDs, check switched off']);
  });
  const solvedRow = (arm: Arm[], digits: [number, number, number, number]) => {
    const ok = arm.map((a) => a.board1!).filter((b) => b && !b.failed);
    expect(ok).toHaveLength(20);
    return [
      fmt(median(arm.map((a) => a.views_kept))),
      fmt(median(arm.map((a) => a.views_with_wrong))),
      median(ok.map((b) => b.rms)).toFixed(digits[0]),
      median(ok.map((b) => b.model_mean)).toFixed(digits[1]),
      median(ok.map((b) => b.model_worst)).toFixed(digits[2]),
      Math.max(...ok.map((b) => b.model_worst)).toFixed(digits[3]),
    ];
  };
  it('separate IDs, board 1', () => expect(rows[0].slice(1)).toEqual(solvedRow(sessions.map((s) => s.distinct_check), [3, 3, 3, 2])));
  it('separate IDs, both boards', () => {
    const b = sessions.map((s) => s.distinct_both);
    expect(rows[1].slice(1)).toEqual([fmt(median(b.map((x) => x.views))), '0', median(b.map((x) => x.rms)).toFixed(3), median(b.map((x) => x.model_mean)).toFixed(3), median(b.map((x) => x.model_worst)).toFixed(3), Math.max(...b.map((x) => x.model_worst)).toFixed(2)]);
    expect(sessions.every((s) => s.distinct_check.views_with_wrong === 0)).toBe(true);
  });
  it('same IDs with the check on: nothing kept, nothing to solve', () => {
    expect(sessions.every((s) => s.same_check.views_kept === 0 && s.same_check.board1 === null)).toBe(true);
    expect(rows[2].slice(1)).toEqual(['0', '0', 'no solution', 'no solution', 'no solution', 'no solution']);
  });
  it('same IDs with the check off', () => expect(rows[3].slice(1)).toEqual(solvedRow(sessions.map((s) => s.same_nocheck), [0, 0, 0, 0])));

  it('the prose quotes the same numbers', () => {
    const off = sessions.map((s) => s.same_nocheck);
    const worstOff = Math.max(...off.map((a) => a.worst_off ?? 0)).toFixed(0);
    expect(flat).toContain(`${fmt(median(off.map((a) => a.views_with_wrong)))} of 20 images had corners in the wrong place, some ${worstOff} px`);
    const rms = median(off.map((a) => a.board1!.rms)), clean = median(sessions.map((s) => s.distinct_check.board1!.rms));
    expect(flat).toContain(`came out at ${rms.toFixed(0)} px, more than a thousand times the ${clean.toFixed(3)} px`);
    expect(rms / clean).toBeGreaterThan(1000);
    const one = sessions.map((s) => s.distinct_check.board1!), both = sessions.map((s) => s.distinct_both);
    expect(flat).toContain(`Board 1 alone gave a model within ${median(one.map((b) => b.model_worst)).toFixed(3)} px at the worst pixel. Both boards together gave ${median(both.map((b) => b.model_worst)).toFixed(3)} px, and the worst session dropped from ${Math.max(...one.map((b) => b.model_worst)).toFixed(2)} px to ${Math.max(...both.map((b) => b.model_worst)).toFixed(2)} px`);
  });
});

describe('repeated markers: 300 saved views', () => {
  const clean = dups.filter((d) => d.repeated === 0), repeated = dups.filter((d) => d.repeated > 0);
  it('every view with a repeated ID lost, every clean view kept', () => {
    expect(dups).toHaveLength(300);
    expect(clean.every((d) => d.corners_default > 0)).toBe(true);
    expect(repeated.every((d) => d.corners_default === 0)).toBe(true);
    expect(Math.min(...repeated.map((d) => d.repeated))).toBe(1);
  });
  it('the counts in the text', () => {
    expect(flat).toContain(`In the ${clean.length} images where no marker of board 2 was decoded, board 1 was found every time. In the ${repeated.length} images with at least one repeated ID, it was found in none. The fewest repeats was one.`);
    expect(flat).toContain(`All ${repeated.length} such images in our test were lost, including one with a single repeated marker.`);
    expect(front).toContain(`In our test that held for all ${repeated.length} such images, including one with a single repeated marker.`);
  });
});

describe('version table: results/versions.txt', () => {
  const line = (v: string, c: string) => versionsTxt.split('\n').find((l) => l.startsWith(`${v} ${c}`) && !l.includes('no checkMarkers switch'))!;
  const cell = (l: string) => {
    if (l.endsWith('no corners')) return 'no corners';
    const m = l.match(/(\d+) corners, board1 (\d+), board2 (\d+), neither (\d+)/)!;
    const [, n, b1, b2, nb] = m;
    return +b2 === 0 && +nb === 0 ? `${n} corners: ${b1} on board 1` : `${n} corners: ${b1} on board 1, ${b2} on board 2, ${nb} between`;
  };
  const rows = tables('OpenCV')[0];
  const expected: [string, string, string][] = [
    ['4.6', '4.6.0', 'interpolateCornersCharuco'],
    ['4.7', '4.7.0', 'default'],
    ['4.12, 5.1, check switched off', '5.1.0', 'checkMarkers off'],
  ];
  it.each(expected)('%s', (label, v, how) => {
    const row = rows.find((r) => r[0] === label)!;
    expect(row.slice(1)).toEqual([cell(line(v, `full ${how}`)), cell(line(v, `part ${how}`))]);
    if (v === '5.1.0') for (const c of ['full', 'part']) expect(cell(line('4.12.0', `${c} checkMarkers off`))).toBe(cell(line(v, `${c} ${how}`)));
  });
  it('4.8 to 5.1 return nothing with the check on', () => {
    for (const v of ['4.8.0', '4.9.0', '4.10.0', '4.11.0', '4.12.0', '5.1.0']) for (const c of ['full', 'part']) expect(line(v, `${c} default`)).toMatch(/no corners$/);
    expect(rows.find((r) => r[0] === '4.8, 4.9, 4.10, 4.11')!.slice(1)).toEqual(['no corners', 'no corners']);
    expect(rows.find((r) => r[0] === '4.12, 5.1')!.slice(1)).toEqual(['no corners', 'no corners']);
  });
  it('the switch exists from 4.12 only', () => {
    for (const v of ['4.7.0', '4.8.0', '4.9.0', '4.10.0', '4.11.0']) expect(versionsTxt).toContain(`${v} full: no checkMarkers switch`);
    expect(flat).toContain('From OpenCV 4.12 the check can be switched off with `CharucoParameters.checkMarkers = False`. In 4.8 to 4.11 it is always on.');
  });
});

describe('dictionary table: results/reach.json and results/dicts.txt', () => {
  const rows = tables('Dictionary')[0];
  const PX = [18.9, 16.5, 14.7, 13.2];
  const pct = (name: string, px: number) => { const r = reach[name].rows.find((x) => x.marker_px === px)!; return Math.round((100 * r.decoded) / r.total); };
  const corrects = (name: string) => +dictsTxt.match(new RegExp(`^${name} markers \\d+ min_distance \\d+ correction_bits (\\d+)$`, 'm'))![1];
  it('six dictionaries', () => expect(rows.map((r) => r[0])).toEqual(['DICT_4X4_50', 'DICT_5X5_100', 'DICT_6X6_250', 'DICT_5X5_1000', 'DICT_6X6_1000', 'DICT_7X7_1000']));
  it.each(['DICT_4X4_50', 'DICT_5X5_100', 'DICT_6X6_250', 'DICT_5X5_1000', 'DICT_6X6_1000', 'DICT_7X7_1000'])('%s', (name) => {
    const row = rows.find((r) => r[0] === name)!;
    const n = reach[name].markers;
    expect(row.slice(1)).toEqual([String(n), String(Math.floor(n / 35)), String(corrects(name)), ...PX.map((px) => `${pct(name, px)} %`)]);
  });
  it('no dictionary misread a marker', () => {
    for (const d of Object.values(reach)) for (const r of d.rows) expect(r.wrong).toBe(0);
  });
  it('the small dictionaries are the first markers of the large ones', () => {
    expect(dictsTxt).toContain('DICT_6X6_250 is the first 250 markers of DICT_6X6_1000: True');
  });
  it('the FAQ quotes the table', () => {
    expect(front).toContain(`at 16.5 px per marker it found ${pct('DICT_6X6_1000', 16.5)} % of the markers where DICT_6X6_250 found ${pct('DICT_6X6_250', 16.5)} %, with the same printed markers. DICT_7X7_1000 found ${pct('DICT_7X7_1000', 16.5)} %.`);
  });
});

describe('the script in the guide', () => {
  const blocks = [...body.matchAll(/```(\w+)\n([\s\S]*?)```/g)];
  it('is the saved script, and its output is the saved output', () => {
    const script = readFileSync(`${DIR}/same_ids.py`, 'utf8');
    const code = script.slice(script.indexOf('import numpy'));
    expect(blocks.some(([, lang, text]) => lang === 'python' && text === code)).toBe(true);
    const output = readFileSync(`${DIR}/results/same_ids.txt`, 'utf8');
    expect(blocks.some(([, lang, text]) => lang === 'text' && text === output)).toBe(true);
  });
});

describe('first figure', () => {
  const data = JSON.parse(readFileSync('src/data/same-ids-detection.json', 'utf8')) as SameIdsData;
  it('is the file this code writes from the saved detection', () => {
    expect(readFileSync('src/assets/guides/same-ids-detection.svg', 'utf8')).toBe(sameIdsFigureSvg(data));
  });
  it('says what the detector returned', () => {
    const c = (k: string) => data.cases.find((x) => x.key === k)!;
    expect(c('same').points).toHaveLength(0);
    expect(c('same_check_off').on_board1.filter(Boolean)).toHaveLength(0);
    expect(c('same_check_off').on_board2.filter(Boolean)).toHaveLength(54);
    expect(c('separate').on_board1.filter(Boolean)).toHaveLength(54);
    expect(body).toContain('with the check switched off, all 54 corners land on board 2. Bottom pair, IDs 0 to 34 and 35 to 69: 54 corners, all on board 1.');
  });
});
