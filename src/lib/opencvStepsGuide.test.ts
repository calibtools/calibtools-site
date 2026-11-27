import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { opencvStepsFigureSvg, opencvStepsWorst, OPENCV_STEPS_ARMS } from './guideFigures';

/**
 * The OpenCV step-by-step guide. Every number is recomputed from the saved sessions and detections in
 * docs/content/experiments/opencv-steps/results/, the two scripts in the text are the files that were run, and their
 * printed output is the saved output. Numbers quoted from other guides are checked against those guides.
 */
const DIR = 'docs/content/experiments/opencv-steps';
const md = readFileSync('src/content/guides/opencv-camera-calibration.md', 'utf8');
const front = md.slice(0, md.indexOf('---', 4));
const body = md.slice(md.indexOf('---', 4) + 3);
const flat = body.replace(/\s+/g, ' ');
const json = (f: string) => JSON.parse(readFileSync(`${DIR}/results/${f}`, 'utf8'));
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pctl = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b), i = (p / 100) * (s.length - 1), lo = Math.floor(i); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo); };
type Solve = { rms: number; model_worst: number; fx: number; fy: number; cx: number; cy: number };
type Session = { views: number; default: Solve; rational: Solve; fewer: Solve };
const S = json('sessions.json') as { true: { fx: number; cx: number; cy: number }; results: Record<string, Session[]> };
const T = S.true;
const worst = (arm: string, k: 'default' | 'rational' | 'fewer' = 'default') => `${median(S.results[arm].map((s) => s[k].model_worst)).toFixed(2)} px`;
const rms = (arm: string) => `${median(S.results[arm].map((s) => s.default.rms)).toFixed(3)} px`;
const fxErr = (arm: string) => `${median(S.results[arm].map((s) => (100 * Math.abs(s.default.fx - T.fx)) / T.fx)).toFixed(3)} %`;

function tableAfter(heading: string, firstHeader: string): string[][] {
  const lines = body.split('\n'); const h = lines.findIndex((l) => l.startsWith(heading)); expect(h).toBeGreaterThan(-1);
  const i = lines.findIndex((l, k) => k > h && l.startsWith(`| ${firstHeader} |`)); expect(i).toBeGreaterThan(-1);
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  return rows;
}

describe('how the views were taken', () => {
  it('20 sessions of 20 views per row', () => {
    expect(Object.keys(S.results)).toHaveLength(7);
    for (const v of Object.values(S.results)) { expect(v).toHaveLength(20); for (const s of v) expect(s.default && s.rational && s.fewer).toBeTruthy(); }
    const lost = Object.fromEntries(Object.entries(S.results).map(([a, v]) => [a, 400 - v.reduce((n, s) => n + s.views, 0)]));
    expect(Object.entries(lost).filter(([, n]) => n > 0)).toEqual([['tilt_40_to_60', 7]]);
    expect(flat).toContain('7 of the 400 views were not found at all');
  });
  it('table in step 4', () => {
    const arms = ['as_in_the_guide', 'tilt_15_to_25', 'one_distance', 'tilt_40_to_60', 'tilt_under_5', 'tilt_under_5_one_distance', 'middle_only'];
    expect(tableAfter('## 4. Take the images', 'How the views were taken').map((r) => r.slice(1))).toEqual(arms.map((a) => [rms(a).replace(' px', ''), fxErr(a), worst(a)]));
    const r = (a: string) => median(S.results[a].map((s) => s.default.rms));
    expect(Math.max(r('tilt_under_5'), r('middle_only'))).toBeLessThan(r('tilt_15_to_25') + 0.003);
    expect(Math.max(r('tilt_under_5'), r('middle_only'))).toBeLessThan(r('as_in_the_guide'));
  });
  it('short answer, key rule and FAQ', () => {
    expect(flat).toContain(`the model was ${worst('middle_only')} off at the image corners. The RMS did not show it: ${rms('middle_only')} against ${rms('as_in_the_guide')}.`);
    expect(flat).toContain(`the focal length error rose from ${fxErr('as_in_the_guide')} to ${fxErr('tilt_under_5')}. Tilted 40 to 60°, the corners got worse and the model was ${worst('tilt_40_to_60')} off.`);
    expect(flat).toContain(`${worst('one_distance')} at one distance, ${worst('as_in_the_guide')} with distance varied.`);
    expect(front).toContain(`raised the focal length error from ${fxErr('as_in_the_guide')} to ${fxErr('tilt_under_5')}`);
    expect(median(S.results.middle_only.map((s) => s.default.model_worst)).toFixed(1)).toBe('2.9');
    expect(front).toContain('were 2.9 px off at the corners'); expect(front).toContain('had an RMS of 0.022 px and a lens model 2.9 px off');
    for (const a of ['as_in_the_guide', 'tilt_15_to_25']) expect(median(S.results[a].map((s) => s.default.model_worst))).toBeLessThan(0.2);
    const all = Object.keys(S.results).filter((a) => a !== 'tilt_40_to_60').map((a) => median(S.results[a].map((s) => s.default.rms)));
    expect(Math.min(...all)).toBeGreaterThan(0.015); expect(Math.max(...all)).toBeLessThan(0.035);
  });
  it('step 7: the two sanity checks', () => {
    const row = (a: string) => [`${Math.max(...S.results[a].map((s) => Math.max(Math.abs(s.default.cx - T.cx), Math.abs(s.default.cy - T.cy)))).toFixed(1)} px`, `${Math.max(...S.results[a].map((s) => Math.abs(s.default.fx - s.default.fy))).toFixed(2)} px`, worst(a)];
    expect(tableAfter('## 7. Check the result', 'Session').map((r) => r.slice(1))).toEqual([row('as_in_the_guide'), row('middle_only')]);
  });
  it('step 8: distortion terms', () => {
    expect(tableAfter('## 8. More distortion terms?', 'Session').map((r) => r.slice(1))).toEqual(['as_in_the_guide', 'middle_only'].map((a) => [worst(a), worst(a, 'rational'), worst(a, 'fewer')]));
  });
});

describe('detectors', () => {
  type Det = { views_found: number; corner_err: number[]; sessions: { model_worst: number }[] };
  const D = (json('detectors.json') as { views: number; results: Record<string, Det> }).results;
  const row = (k: string) => [String(D[k].views_found), `${median(D[k].corner_err).toFixed(3)} px`, `${pctl(D[k].corner_err, 95).toFixed(3)} px`, `${median(D[k].sessions.map((s) => s.model_worst)).toFixed(2)} px`];
  it('table in step 6', () => {
    expect(tableAfter('## 6. With a checkerboard', 'Detector').map((r) => r.slice(1))).toEqual(['charuco', 'checkerboard_classic', 'checkerboard_sb'].map(row));
    for (const d of Object.values(D)) { expect(d.corner_err).toHaveLength(400 * 54); expect(d.sessions).toHaveLength(20); }
  });
  it('FAQ and "what we got wrong"', () => {
    const c = median(D.checkerboard_classic.corner_err).toFixed(3), sb = median(D.checkerboard_sb.corner_err).toFixed(3);
    expect(front).toContain(`cornerSubPix were ${c} px from the truth at the median, those from findChessboardCornersSB ${sb} px`);
    expect(flat).toContain(`${sb} px against ${c} px at the median`);
  });
});

describe('scripts', () => {
  const blocks = [...body.matchAll(/```(\w+)\n([\s\S]*?)```/g)];
  it('the two scripts in the text are the files that were run, with their saved output', () => {
    expect(blocks.filter(([, l]) => l === 'python').map(([, , t]) => t)).toEqual(['calibrate.py', 'calibrate_checkerboard.py'].map((f) => readFileSync(`${DIR}/${f}`, 'utf8')));
    expect(blocks.filter(([, l]) => l === 'text').map(([, , t]) => t)).toEqual(['calibrate.txt', 'calibrate_checkerboard.txt'].map((f) => readFileSync(`${DIR}/results/${f}`, 'utf8')));
  });
  it('their results against the camera the images were made with', () => {
    const e = json('end_to_end.json') as Record<'charuco' | 'checker', { fx_error_pct: number; model_worst_px: number }> & { true: { fx: number; cx: number; cy: number; k1: number } };
    expect([e.true.fx, e.true.cx, e.true.cy, e.true.k1]).toEqual([2250, 960, 720, -0.12]);
    expect(flat).toContain(`The script's result is ${e.charuco.fx_error_pct.toFixed(3)} % off in focal length and its lens model is within ${e.charuco.model_worst_px.toFixed(2)} px at every pixel.`);
    expect(flat).toContain(`recovered the focal length within ${e.charuco.fx_error_pct.toFixed(3)} % and the lens model within ${e.charuco.model_worst_px.toFixed(2)} px everywhere`);
    expect(flat).toContain(`That is ${e.checker.fx_error_pct.toFixed(3)} % off in focal length and within ${e.checker.model_worst_px.toFixed(2)} px at every pixel.`);
    expect(((2 * Math.atan(960 / 2250) * 180) / Math.PI).toFixed(0)).toBe('46');
  });
});

describe('numbers quoted from other guides', () => {
  const guide = (slug: string) => readFileSync(`src/content/guides/${slug}.md`, 'utf8');
  it('still say what this page says they say', () => {
    expect(guide('how-many-calibration-images')).toContain('Twenty well-spread images gave a lens model within 0.5 px everywhere; ten gave about 1 px; beyond thirty, more images did not help.');
    expect(guide('calibration-target-size')).toContain('every marker bit is 3 px or more in the image, and about 60 % of the frame width as a starting point');
    expect(guide('printed-target-costs-half-a-pixel')).toMatch(/1 mm[^.]*2\.2 % short/);
  });
});

describe('first figure', () => {
  it('is the file this code writes from the saved sessions', () => {
    expect(readFileSync('src/assets/guides/opencv-steps-views-vs-model-error.svg', 'utf8')).toBe(opencvStepsFigureSvg(S.results));
  });
  it('alt text carries the same values', () => {
    const v = Object.fromEntries(OPENCV_STEPS_ARMS.map(([a]) => [a, opencvStepsWorst(S.results, a).toFixed(2)]));
    expect(body).toContain(`tilted 15 to 25°: ${v.tilt_15_to_25} px. Tilted 5 to 45°: ${v.as_in_the_guide} px. Same at one distance: ${v.one_distance} px. Tilted 40 to 60°: ${v.tilt_40_to_60} px. Tilted under 5°: ${v.tilt_under_5} px. Always in the middle: ${v.middle_only} px.`);
  });
});
