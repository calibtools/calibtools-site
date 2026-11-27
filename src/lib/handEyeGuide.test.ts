import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { handEyeRotationFigureSvg, handEyeRotationRows, HAND_EYE_ROTATION_CASES, fmtMm } from './guideFigures';

/**
 * Every number in the hand-eye guide comes from the saved runs in docs/content/experiments/hand-eye/.
 * Tables and figures in the text are recomputed here from the per-run results, so a number changed by hand fails.
 */
const DIR = 'docs/content/experiments/hand-eye';
const md = readFileSync('src/content/guides/hand-eye-calibration-opencv.md', 'utf8');
const front = md.slice(0, md.indexOf('---', 4));
const body = md.slice(md.indexOf('---', 4) + 3);
const flat = body.replace(/\s+/g, ' ');

type Err = [number, number, number] | null;                       // rotation deg, translation mm, error at 500 mm
type Run = { step_deg: number | null; Park: Err; Tsai?: Err; Horaud?: Err; Andreff?: Err; Daniilidis?: Err; spread_mean?: number; spread_max?: number; flagged?: boolean; after_drop?: Err };
const saved = JSON.parse(readFileSync(`${DIR}/results/sessions.json`, 'utf8')) as { sessions: number; cases: Record<string, Run[]> };
const C = saved.cases;
type Method = 'Park' | 'Tsai' | 'Horaud' | 'Andreff' | 'Daniilidis';

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const q90 = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.ceil(0.9 * s.length) - 1]; };
const ok = (name: string, m: Method = 'Park') => C[name].map((r) => r[m]).filter(Boolean) as [number, number, number][];
const rot = (name: string) => `${median(ok(name).map((e) => e[0])).toFixed(2)}°`;
const tr = (name: string) => `${fmtMm(median(ok(name).map((e) => e[1])))} mm`;
const pt = (name: string, m: Method = 'Park') => `${fmtMm(median(ok(name, m).map((e) => e[2])))} mm`;
const pt90 = (name: string) => `${fmtMm(q90(ok(name).map((e) => e[2])))} mm`;
const step = (name: string) => median(C[name].map((r) => r.step_deg!)).toFixed(0);
const spread = (name: string, k: 'spread_mean' | 'spread_max' = 'spread_mean') => `${fmtMm(median(C[name].map((r) => r[k]!)))} mm`;

function table(firstHeader: string): string[][] {
  const lines = body.split('\n'); const i = lines.findIndex((l) => l.startsWith(`| ${firstHeader} |`));
  expect(i).toBeGreaterThan(-1);
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  return rows;
}

describe('saved runs', () => {
  it('200 runs for every case', () => {
    expect(saved.sessions).toBe(200);
    for (const v of Object.values(C)) expect(v).toHaveLength(200);
  });
});

describe('table: how much rotation', () => {
  it('six rows', () => {
    expect(table('Rotation between poses')).toEqual(HAND_EYE_ROTATION_CASES.map((n) => [`about ${step(n)}°`, rot(n), tr(n), pt(n), pt90(n)]));
  });
  it('the default case is the 31 degree row', () => {
    expect(step('tilt_30')).toBe('31'); expect(step('poses_20_good')).toBe('31');
    expect(flat).toContain('which puts about 31° between poses');
  });
  it('comparisons in the text', () => {
    const p = (n: string) => median(ok(n).map((e) => e[2]));
    expect(p('tilt_5') / p('tilt_30')).toBeGreaterThan(p('poses_3_good') / p('poses_50_good'));
    expect(flat).toContain('Going from 5° to 31° between poses did more than going from 3 poses to 50.');
    expect(Math.round(p('tilt_10') / p('tilt_30'))).toBe(6);
    expect(flat).toContain('The cost of 10° instead of 31° is six times the error.');
  });
});

describe('table: how many poses', () => {
  const N = [3, 4, 6, 10, 15, 20, 30, 50];
  it('eight rows', () => {
    expect(table('Poses')).toEqual(N.map((n) => [String(n), pt(`poses_${n}_good`), pt90(`poses_${n}_good`), pt(`poses_${n}_rough`)]));
  });
  it('the rougher robot is three to four times worse', () => {
    for (const n of N) {
      const k = median(ok(`poses_${n}_rough`).map((e) => e[2])) / median(ok(`poses_${n}_good`).map((e) => e[2]));
      expect(k).toBeGreaterThan(3); expect(k).toBeLessThan(4.1);
    }
    expect(flat).toContain(`one run in ten was off by ${pt90('poses_3_good')} or more`);
  });
});

describe('table: which method', () => {
  const rows = table('Method');
  const M: Method[] = ['Tsai', 'Park', 'Horaud', 'Andreff', 'Daniilidis'];
  it('five methods at three rotations', () => {
    expect(rows).toEqual(M.map((m) => [`\`CALIB_HAND_EYE_${m.toUpperCase()}\``, pt('tilt_30', m), pt('tilt_10', m), pt('tilt_5', m)]));
    expect([step('tilt_30'), step('tilt_10'), step('tilt_5')]).toEqual(['31', '10', '5']);
  });
  it('Tsai returns the same wrong matrix in all 200 runs at about 5 degrees', () => {
    const t = ok('tilt_5', 'Tsai');
    expect(t).toHaveLength(200);
    expect(new Set(t.map((e) => e.join(','))).size).toBe(1);
    expect(flat).toContain(`the same one every time, ${t[0][0].toFixed(2)}° and ${fmtMm(t[0][2])} mm off`);
    expect(front).toContain(`Tsai gave up in all 200 runs and still returned a matrix, ${fmtMm(t[0][2])} mm off`);
  });
  it('no method failed with rotation about more than one axis', () => {
    for (const n of HAND_EYE_ROTATION_CASES) for (const m of M) expect(ok(n, m)).toHaveLength(200);
  });
});

describe('motions that cannot work', () => {
  it('one axis and translation only', () => {
    expect(flat).toContain(`about ${step('one_axis')}° between poses. The best method, Andreff, was off by ${pt('one_axis', 'Andreff')}. Park returned NaN or a matrix that is not a rotation in ${200 - ok('one_axis').length} of 200 runs.`);
    expect(flat).toContain(`Andreff was off by ${pt('translate_only', 'Andreff')}. Park failed in ${200 - ok('translate_only').length} of 200 runs.`);
    for (const n of ['one_axis', 'translate_only']) {
      const best = Math.min(...(['Tsai', 'Park', 'Horaud', 'Andreff', 'Daniilidis'] as Method[]).map((m) => median(ok(n, m).map((e) => e[2]))));
      expect(best).toBeGreaterThan(100);
    }
  });
});

describe('camera side and residual', () => {
  it('corner noise table', () => {
    expect(table('Change')).toEqual([['0.03', '0.03'], ['0.1', '0.1'], ['0.3', '0.3'], ['1', '1.0']].map(([label, key]) => [`Corner noise ${label} px`, pt(`pixel_${key}`)]));
  });
  it('residual table', () => {
    expect(table('Case')).toEqual([
      ['Everything right', spread('baseline_seed6'), pt('baseline_seed6')],
      ['Focal length 0.5 % too long', spread('focal_plus_0.5pct'), pt('focal_plus_0.5pct')],
      ['Square size entered 1 % too large', spread('square_plus_1pct'), pt('square_plus_1pct')],
      ['Lens distortion left out', spread('no_distortion_model'), pt('no_distortion_model')],
      ['Robot good to 0.5 mm', spread('poses_20_rough'), pt('poses_20_rough')],
    ]);
  });
  it('the sentences around it', () => {
    const s = (n: string) => median(C[n].map((r) => r.spread_mean!)), p = (n: string) => median(ok(n).map((e) => e[2]));
    expect((s('focal_plus_0.5pct') - s('baseline_seed6')).toFixed(1)).toBe('0.1');
    expect(flat).toContain(`moves the result by ${fmtMm(p('focal_plus_0.5pct'))} mm and the residual by 0.1 mm`);
    expect(s('poses_20_rough') / s('focal_plus_0.5pct')).toBeGreaterThan(3);
    expect(p('poses_20_rough') / p('focal_plus_0.5pct')).toBeCloseTo(0.25, 1);
    expect(front).toContain(`the target stayed within ${spread('focal_plus_0.5pct')} from pose to pose while the result was off by ${pt('focal_plus_0.5pct')}`);
    expect(front).toContain(`it was ${spread('square_plus_1pct')} against ${pt('square_plus_1pct')}`);
    expect(flat).toContain(`Focal length off by 0.5 %: residual ${spread('focal_plus_0.5pct')}, real error ${pt('focal_plus_0.5pct')}.`);
  });
  it('one bad pose', () => {
    expect(table('One reading off by')).toEqual([2, 5, 20].map((mm) => {
      const n = `bad_pose_${mm}mm`;
      return [`${mm} mm`, pt(n), spread(n, 'spread_max'), `${C[n].filter((r) => r.flagged).length} of 200 runs`, `${fmtMm(median(C[n].map((r) => r.after_drop![2])))} mm`];
    }));
  });
});

describe('eye-to-hand, and numbers quoted elsewhere', () => {
  it('table', () => {
    expect(table('Robot')).toEqual([
      ['Good to 0.05 mm', pt('poses_20_good'), pt('eye_to_hand_good')],
      ['Good to 0.5 mm', pt('poses_20_rough'), pt('eye_to_hand_rough')],
    ]);
    expect(front).toContain(`${pt('eye_to_hand_good')} against ${pt('poses_20_good')}`);
  });
  it('short answer and FAQ', () => {
    expect(flat).toContain(`About 2° gave ${pt('tilt_2')} of error at the work point, 31° gave ${pt('tilt_30')}.`);
    expect(flat).toContain(`20 poses gave ${pt('poses_20_good')}, 50 poses ${pt('poses_50_good')}. Three poses gave ${pt('poses_3_good')}.`);
    expect(front).toContain(`3 poses left a point 500 mm from the camera off by ${pt('poses_3_good')}, 10 poses by ${pt('poses_10_good')}, 20 poses by ${pt('poses_20_good')} and 50 poses by ${pt('poses_50_good')}`);
    expect(front).toContain(`about 2° between poses gave ${pt('tilt_2')} of error at 500 mm, 10° gave ${pt('tilt_10')}, 31° gave ${pt('tilt_30')} and 46° gave ${pt('tilt_45')}`);
    expect(front).toContain(`2° between poses gave ${pt('tilt_2')} of error, 30° gave ${pt('tilt_30')}`);
    expect(step('tilt_45')).toBe('46');
  });
  it('what we got wrong', () => {
    expect(flat).toContain(`With a robot good to 0.05 mm we get ${rot('poses_20_good')} and ${tr('poses_20_good')}, with one good to 0.5 mm, ${rot('poses_20_rough')} and ${tr('poses_20_rough')}.`);
  });
  it('the corner noise is above what the detector showed in rendered images', () => {
    const ts = JSON.parse(readFileSync('docs/content/experiments/target-size/results/sessions.json', 'utf8')) as { results: Record<string, { corner_err_median: number | null }[]> };
    const meds = Object.entries(ts.results).filter(([n]) => n !== 'dense_30').map(([, v]) => median(v.map((s) => s.corner_err_median!)));
    expect(Math.min(...meds).toFixed(2)).toBe('0.02'); expect(Math.max(...meds).toFixed(2)).toBe('0.04');
    expect(flat).toContain('were off by 0.02 to 0.04 px at the median');
  });
});

describe('the code in the guide', () => {
  const blocks = [...body.matchAll(/```(\w+)\n([\s\S]*?)```/g)];
  const py = blocks.filter(([, lang]) => lang === 'python').map(([, , text]) => text);
  const inHand = readFileSync(`${DIR}/eye_in_hand.py`, 'utf8'), toHand = readFileSync(`${DIR}/eye_to_hand.py`, 'utf8');
  const sim = readFileSync(`${DIR}/rotation_matters.py`, 'utf8');
  it('every block is part of a script that was run', () => {
    expect(py).toHaveLength(9);
    const simCode = sim.slice(sim.indexOf('import numpy'));
    for (const b of py) expect(inHand.includes(b) || toHand.includes(b) || b === simCode).toBe(true);
    expect(py.filter((b) => b === simCode)).toHaveLength(1);
    expect(py.some((b) => toHand.includes(b) && !inHand.includes(b))).toBe(true);
  });
  it('the end-to-end run on rendered images', () => {
    const e = JSON.parse(readFileSync(`${DIR}/results/end_to_end.json`, 'utf8')) as { poses: number; results: Record<'in' | 'to', { poses_used: number; rotation_error_deg: number; translation_error_mm: number }> };
    expect([e.poses, e.results.in.poses_used, e.results.to.poses_used]).toEqual([15, 15, 15]);
    expect(flat).toContain(`on 15 rendered images of a ChArUco board for each arrangement. Eye-in-hand came out ${e.results.in.rotation_error_deg.toFixed(2)}° and ${fmtMm(e.results.in.translation_error_mm)} mm from the truth, eye-to-hand ${e.results.to.rotation_error_deg.toFixed(2)}° and ${fmtMm(e.results.to.translation_error_mm)} mm.`);
  });
  it('the output under "Try it yourself" is the saved output', () => {
    const out = readFileSync(`${DIR}/results/rotation_matters.txt`, 'utf8');
    expect(blocks.some(([, lang, text]) => lang === 'text' && text === out)).toBe(true);
  });
});

describe('first figure', () => {
  const rows = handEyeRotationRows(C, HAND_EYE_ROTATION_CASES);
  it('is the file this code writes from the saved runs', () => {
    expect(readFileSync('src/assets/guides/hand-eye-rotation-vs-error.svg', 'utf8')).toBe(handEyeRotationFigureSvg(rows));
  });
  it('its alt text carries the same numbers', () => {
    const words = rows.map((r) => `${r.stepDeg.toFixed(0)} degrees ${fmtMm(r.pointMm)} mm`);
    expect(body).toContain(`about ${words[0]}, ${words.slice(1).join(', ')}.`);
  });
});
