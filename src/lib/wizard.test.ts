import { describe, it, expect } from 'vitest';
import { recommend, type WizardAnswers } from './wizard';

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

  it('halcon toolchain → HALCON-style dots', () => {
    const r = recommend({ ...base, toolchain: 'halcon' });
    expect(r.pattern).toBe('HALCON-style dots');
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
