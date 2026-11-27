import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { cameraImuMotionFigureSvg, cameraImuMotionRows, CAMERA_IMU_MOTION_CASES, fmtMm } from './guideFigures';

/**
 * The Kalibr camera-IMU guide rests on three things, all saved in docs/content/experiments/camera-imu/results/:
 * facts read from Kalibr's source and wiki (kalibr_facts.json), simulated recordings solved with our own estimator
 * (recordings.json) and a simulated Allan deviation (allan.json). Every number and every Kalibr fact in the text is
 * checked against them here.
 */
const DIR = 'docs/content/experiments/camera-imu';
const md = readFileSync('src/content/guides/kalibr-camera-imu-calibration.md', 'utf8');
const front = md.slice(0, md.indexOf('---', 4));
const body = md.slice(md.indexOf('---', 4) + 3);
const flat = body.replace(/\s+/g, ' ');
const json = (f: string) => JSON.parse(readFileSync(`${DIR}/results/${f}`, 'utf8'));

type Rec = { trial: number; rot_deg: number; trans_mm: number; offset_err_ms: number; offset_ms: number; failed?: string };
const C = (json('recordings.json') as { trials: number; cases: Record<string, Rec[]> }).cases;
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const tr = (n: string) => `${fmtMm(median(C[n].map((r) => r.trans_mm)))} mm`;
const rot = (n: string) => `${median(C[n].map((r) => r.rot_deg)).toFixed(2)}°`;
const offs = (n: string) => `${median(C[n].map((r) => r.offset_ms)).toFixed(1)} ms`.replace('-', '−');
const offErr = (n: string, d = 1) => median(C[n].map((r) => Math.abs(r.offset_err_ms))).toFixed(d);

function tableAfter(heading: string, firstHeader: string): string[][] {
  const lines = body.split('\n'); const h = lines.findIndex((l) => l.startsWith(heading)); expect(h).toBeGreaterThan(-1);
  const i = lines.findIndex((l, k) => k > h && l.startsWith(`| ${firstHeader} |`)); expect(i).toBeGreaterThan(-1);
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  return rows;
}

describe('simulated recordings', () => {
  it('30 per case, none failed', () => {
    expect(Object.keys(C)).toHaveLength(17);
    for (const v of Object.values(C)) { expect(v).toHaveLength(30); expect(v.some((r) => r.failed)).toBe(false); }
  });
  it('motion table', () => {
    const order = ['brisk', 'baseline', 'slow', 'no_translation', 'one_rotation_axis', 'no_rotation'];
    const labels = ['All axes, twice the pace', 'All axes, steady pace', 'All axes, half the pace', 'Rotation only, no translation', 'Rotation about one axis, translation along all', 'Translation only, no rotation'];
    expect(tableAfter('## How to move the rig', 'Motion')).toEqual(order.map((n, i) => [labels[i], rot(n), tr(n)]));
    expect(CAMERA_IMU_MOTION_CASES.map(([n]) => n)).toEqual(order);
  });
  it('recording length', () => {
    expect(tableAfter('## How to move the rig', 'Recording length')).toEqual([['20 s', tr('seconds_20')], ['60 s', tr('baseline')], ['120 s', tr('seconds_120')]]);
    expect(flat).toContain(`20 s gave ${tr('seconds_20')}, 60 s gave ${tr('baseline')}, 120 s gave ${tr('seconds_120')}.`);
  });
  it('time offset table', () => {
    expect(tableAfter('## Time offset and timestamps', 'Case')).toEqual([
      ['Offset of 4 ms, estimated', offs('baseline'), rot('baseline'), tr('baseline')],
      ['Offset of 20 ms, estimated', offs('offset_20ms'), rot('offset_20ms'), tr('offset_20ms')],
      ['Offset of 4 ms, fixed at zero', 'not estimated', rot('offset_4ms_ignored'), tr('offset_4ms_ignored')],
      ['Offset of 20 ms, fixed at zero', 'not estimated', rot('offset_20ms_ignored'), tr('offset_20ms_ignored')],
      ['Camera stamped on arrival, 0 to 15 ms late', offs('camera_jitter_15ms'), rot('camera_jitter_15ms'), tr('camera_jitter_15ms')],
      ['IMU delivered in bursts of ten samples', offs('imu_bursts_of_10'), rot('imu_bursts_of_10'), tr('imu_bursts_of_10')],
    ]);
    expect(flat).toContain(`The offset moved by ${offErr('camera_jitter_15ms')} ms, the average delay.`);
    expect(flat).toContain(`A 20 ms offset that is ignored cost ${tr('offset_20ms_ignored')} and ${rot('offset_20ms_ignored')}. Estimated, it was found to ${offErr('offset_20ms', 2)} ms.`);
    expect(flat).toContain(`IMU samples delivered in bursts of ten: ${tr('imu_bursts_of_10')}, and a time offset wrong by ${offErr('imu_bursts_of_10')} ms.`);
    expect(flat).toContain(`The second stream is the one that cost ${tr('imu_bursts_of_10')} and ${offErr('imu_bursts_of_10')} ms above.`);
  });
  it('jolts, corner noise, grid size', () => {
    expect(tableAfter('## Jolts, corner noise and the size of the grid', 'Case')).toEqual([
      ['Steady pace, nothing wrong', tr('baseline')], ['A jolt in the first second, kept', tr('shock_kept')], ['A jolt in the first second, cut', tr('shock_trimmed')],
      ['Corner noise 0.3 px instead of 0.1 px', tr('corner_noise_0.3')], ['Grid entered 1 % too large', tr('grid_1pct_large')],
    ]);
    const m = (n: string) => median(C[n].map((r) => r.trans_mm));
    expect(m('corner_noise_0.3') / m('baseline')).toBeGreaterThan(3); expect(m('corner_noise_0.3') / m('baseline')).toBeLessThan(3.6);
    expect(m('slow') / m('baseline')).toBeGreaterThan(2); expect(m('slow') / m('baseline')).toBeLessThan(3);
    expect(flat).toContain(`${tr('grid_1pct_large').replace(' mm', '')} mm is close to the ${tr('baseline').replace(' mm', '')} mm of the recordings with nothing wrong`);
    expect(flat).toContain(`a grid 1 % too large gave ${tr('grid_1pct_large')} of error, against ${tr('baseline')} with the right size`);
  });
  it('short answer and FAQ', () => {
    expect(flat).toContain(`All of it: ${tr('baseline')}. Rotation about one axis: ${tr('one_rotation_axis')}. Rotation with no translation: ${tr('no_translation')}.`);
    expect(flat).toContain(`Half the pace more than doubled the error, to ${tr('slow')}. Twice the pace brought it to ${tr('brisk')}.`);
    expect(flat).toContain(`A jolt in the first second: ${tr('shock_kept')}. With that second cut: ${tr('shock_trimmed')}.`);
    expect(front).toContain(`within ${tr('baseline')}. Rotation about one axis only gave ${tr('one_rotation_axis')}, and no rotation at all gave ${tr('no_rotation')}, more than the 69 mm`);
  });
  it('the rig as described', () => {
    const s = json('motion_stats.json') as Record<string, { turn_deg_per_s: number; acceleration_m_s2: number }> & { imu_to_camera_mm: number };
    expect(s.imu_to_camera_mm.toFixed(0)).toBe('69');
    expect(flat).toContain(`turning at about ${s.baseline.turn_deg_per_s.toFixed(0)}°/s and accelerating at about ${s.baseline.acceleration_m_s2.toFixed(1)} m/s²`);
    expect(median(C.no_rotation.map((r) => r.trans_mm))).toBeGreaterThan(s.imu_to_camera_mm);
  });
});

describe('Allan deviation', () => {
  const A = json('allan.json') as { noise_density_true: number; random_walk_true: number; rows: { hours: number; noise_density: number[]; random_walk: number[]; curve_at_3s: number[] }[] };
  const label: Record<string, string> = { '0.1': '6 minutes', '0.25': '15 minutes', '0.5': '30 minutes', '1': '1 hour', '2': '2 hours', '5': '5 hours' };
  it('table', () => {
    expect(tableAfter('## IMU noise values', 'Recording')).toEqual(A.rows.map((r) => [
      label[String(r.hours)],
      `${Math.max(...r.noise_density.map((n) => Math.abs(n / A.noise_density_true - 1) * 100)).toFixed(1)} %`,
      `${r.random_walk.filter((k) => Math.abs(k / A.random_walk_true - 1) < 0.2).length} of 40`,
    ]));
  });
  it('the curve at 3 s is far above the random walk', () => {
    const ratios = A.rows.map((r) => median(r.curve_at_3s) / A.random_walk_true);
    for (const k of ratios) expect(k.toFixed(1)).toMatch(/^4\.[12]$/);
    expect(ratios[ratios.length - 1].toFixed(1)).toBe('4.2');
    expect(flat).toContain('it stood 4.2 times above the true value');
    expect(front).toContain('which was 4.2 times too high there in our simulation');
  });
  it('simulated with the example values of the IMU file', () => {
    expect(body).toContain(`gyroscope_noise_density:     ${A.noise_density_true.toExponential(2).replace('e-4', 'e-04')}`);
    expect(body).toContain(`gyroscope_random_walk:       ${A.random_walk_true.toExponential(2).replace('e-5', 'e-05')}`);
  });
});

describe('facts read from Kalibr', () => {
  const F = json('kalibr_facts.json');
  it('pinned', () => {
    expect(F.source_commit.slice(0, 7)).toBe('1f60227');
    expect(flat).toContain('Read from Kalibr\'s source at commit `1f60227` and from its wiki.');
  });
  it('every option in the commands exists', () => {
    const commands = [...body.matchAll(/```bash\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
    const cam = commands.slice(commands.indexOf('kalibr_calibrate_cameras'), commands.indexOf('rosbag record -O dynamic.bag'));
    const imu = commands.slice(commands.indexOf('kalibr_calibrate_imu_camera'));
    for (const f of cam.match(/--[a-z-]+/g)!) expect(F.camera_flags).toContain(f);
    for (const f of imu.match(/--[a-z-]+/g)!) expect(F.imu_camera_flags).toContain(f);
    for (const f of ['--no-time-calibration', '--timeoffset-padding', '--bag-from-to']) { expect(F.imu_camera_flags).toContain(f); expect(md).toContain(f); }
    expect(F.imu_camera_flags).not.toContain('--cam');
  });
  it('time calibration and padding', () => {
    expect(F.no_time_calibration_help).toBe('Disable the temporal calibration');
    expect(F.timeoffset_padding_s).toBe(0.03);
    expect(flat.toLowerCase()).toContain(`"${F.timeoffset_padding_help.toLowerCase()}"`);
  });
  it('output file names', () => {
    for (const s of F.camera_outputs.filter((x: string) => !x.includes('poses'))) expect(body).toContain(`\`static${s}\``);
    for (const s of F.imu_camera_outputs.filter((x: string) => !x.includes('poses'))) expect(body).toContain(`\`dynamic${s}\``);
    expect(body).toContain('--cams static-camchain.yaml');
  });
  it('camera models', () => {
    expect(flat).toContain(`The models are ${F.camera_models.slice(0, -1).map((m: string) => `\`${m}\``).join(', ')} and \`${F.camera_models[F.camera_models.length - 1]}\`.`);
  });
  it('statements attributed to Kalibr\'s documentation are in it', () => {
    for (const [k, v] of Object.entries(F.wiki)) expect([k, Array.isArray(v) ? v.every(Boolean) : v]).toEqual([k, true]);
    for (const [k, v] of Object.entries(F.downstream)) expect([k, v]).toEqual([k, true]);
    expect(F.aprilgrid_tag1_bottom_left && F.aprilgrid_point_formula).toBe(true);
    expect(flat).toContain('"try to excite all IMU axes (rotation and translation)"');
    expect(flat).toContain('"for lowest-cost sensors, increasing the noise model parameters by a factor of 10x or more may be necessary"');
  });
});

describe('scripts and their output', () => {
  const blocks = [...body.matchAll(/```(\w+)\n([\s\S]*?)```/g)];
  const has = (lang: string, text: string) => blocks.some(([, l, t]) => l === lang && t === text);
  it('the two scripts are the saved ones', () => {
    for (const f of ['invert.py', 'check_imu_stamps.py']) { const s = readFileSync(`${DIR}/${f}`, 'utf8'); expect(has('python', s.slice(s.indexOf('import sys')))).toBe(true); }
  });
  it('their printed output and the sample result file are the saved ones', () => {
    for (const f of ['invert.txt', 'stamps_steady.txt', 'stamps_bursts.txt']) expect(has('text', readFileSync(`${DIR}/results/${f}`, 'utf8'))).toBe(true);
    expect(has('yaml', readFileSync(`${DIR}/results/camchain_example.yaml`, 'utf8'))).toBe(true);
  });
});

describe('first figure', () => {
  const rows = cameraImuMotionRows(C);
  it('is the file this code writes from the saved recordings', () => {
    expect(readFileSync('src/assets/guides/camera-imu-motion-vs-error.svg', 'utf8')).toBe(cameraImuMotionFigureSvg(rows));
  });
  it('its alt text carries the same numbers', () => {
    expect(body).toContain(`all axes at twice the pace ${fmtMm(rows[0].transMm)} mm, at a steady pace ${fmtMm(rows[1].transMm)} mm, at half the pace ${fmtMm(rows[2].transMm)} mm, rotation only ${fmtMm(rows[3].transMm)} mm, rotation about one axis ${fmtMm(rows[4].transMm)} mm, no rotation ${fmtMm(rows[5].transMm)} mm.`);
  });
});
