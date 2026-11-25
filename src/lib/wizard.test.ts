import { describe, it, expect } from 'vitest';
import { recommend, recommendedSpec, recommendationLink, type WizardAnswers } from './wizard';
import { computeLayout, PAPERS } from './pageLayout';
import { specFromLink } from './patternLink';
import { markerCapacity } from './idRange';
import { kalibrSupported } from './exportConfig';

const base: WizardAnswers = {
  application: 'robotics',
  accuracy: 'medium',
  camera: 'mono',
  environment: 'indoor',
  toolchain: 'opencv',
};

describe('recommend', () => {
  it('opencv toolchain → ChArUco', () => {
    const r = recommend(base);
    expect(r.pattern).toBe('ChArUco');
  });

  it('kalibr toolchain → AprilGrid', () => {
    const r = recommend({ ...base, toolchain: 'kalibr' });
    expect(r.pattern).toBe('AprilGrid (Kalibr)');
    expect(r.dict).toBe('DICT_APRILTAG_36h11');
  });

  it('halcon toolchain → checkerboard (generated dots are not HALCON plates)', () => {
    const r = recommend({ ...base, toolchain: 'halcon' });
    expect(r.pattern).toBe('Checkerboard');
    expect(r.reasoning.some((s) => s.includes('HALCON calibration plate'))).toBe(true);
  });

  it('matlab toolchain → Checkerboard', () => {
    const r = recommend({ ...base, toolchain: 'matlab' });
    expect(r.pattern).toBe('Checkerboard');
  });

  it('high accuracy → aluminum material', () => {
    const r = recommend({ ...base, accuracy: 'high' });
    expect(r.material).toBe('aluminum');
  });

  it('low accuracy → paper material', () => {
    const r = recommend({ ...base, accuracy: 'low' });
    expect(r.material).toBe('paper');
  });

  it('outdoor + paper → upgrades to acrylic', () => {
    const r = recommend({ ...base, accuracy: 'low', environment: 'outdoor' });
    expect(r.material).toBe('acrylic');
  });

  it('fisheye → larger board (A3)', () => {
    const r = recommend({ ...base, camera: 'fisheye' });
    expect(r.paper).toBe('A3');
    expect(r.rows).toBeGreaterThanOrEqual(8);
  });

  it('stereo → A3 paper', () => {
    const r = recommend({ ...base, camera: 'stereo' });
    expect(r.paper).toBe('A3');
  });

  it('marker is always smaller than square', () => {
    const r = recommend({ ...base, accuracy: 'high', camera: 'fisheye' });
    expect(r.marker).toBeLessThan(r.square);
  });

  it('distance-based square sizing', () => {
    const r = recommend({ ...base, sensorW: 8.77, focal: 12, distance: 500 });
    expect(r.square).toBeGreaterThanOrEqual(5);
    expect(r.square).toBeLessThanOrEqual(100);
    expect(r.reasoning.some((s) => s.includes('pixel coverage'))).toBe(true);
  });

  it('always returns non-empty reasoning', () => {
    const r = recommend(base);
    expect(r.reasoning.length).toBeGreaterThanOrEqual(1);
  });
});

describe('the page the wizard names is a page the pattern fits on', () => {
  const answers: WizardAnswers[] = [];
  for (const toolchain of ['opencv', 'ros', 'kalibr', 'halcon', 'matlab', 'other'] as const)
    for (const camera of ['mono', 'fisheye', 'stereo', 'multi'] as const)
      for (const accuracy of ['low', 'medium', 'high'] as const)
        for (const distance of [undefined, 300, 1000, 3000])
          answers.push({ ...base, toolchain, camera, accuracy, ...(distance ? { sensorW: 7.2, focal: 8, distance } : {}) });

  it('the opening recommendation, a 7 × 10 ChArUco of 25 mm squares, is on A3: it does not fit A4', () => {
    const r = recommend({ ...base, accuracy: 'low' });
    expect([r.rows, r.cols, r.square, r.paper]).toEqual([7, 10, 25, 'A3']);
    expect(r.reasoning.join(' ')).toContain('does not fit A4');
  });

  it.each(answers.map((a) => [`${a.toolchain}, ${a.camera}, ${a.accuracy}, ${a.distance ?? 'no'} distance`, a] as const))('%s', (_n, a) => {
    const r = recommend(a);
    const spec = recommendedSpec(r, r.paper);
    const [w, h] = PAPERS[r.paper];
    const fits = computeLayout(spec, w, h, 'auto').fit === 'single';
    // one sheet, unless the wizard says the pattern is larger than A0
    expect(fits || r.reasoning.some((t) => t.includes('larger than A0'))).toBe(true);
    // the link opens that very pattern, and the generator can draw every marker of it
    expect(specFromLink(recommendationLink(r))).toMatchObject({ type: r.pattern, rows: r.rows, cols: r.cols, square: r.square, paper: r.paper });
    expect(markerCapacity(spec)?.short ?? false).toBe(false);
    if (a.toolchain === 'kalibr') expect(kalibrSupported(spec)).toBe(true);
  });
});
