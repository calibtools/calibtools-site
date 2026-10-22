import { describe, it, expect } from 'vitest';
import { calculateFov, minDistance } from './fov';

describe('calculateFov', () => {
  // Reference: full frame 35mm sensor, 50mm lens
  // HFOV = 2 * atan(36 / (2 * 50)) = 2 * atan(0.36) = 39.598°
  // VFOV = 2 * atan(24 / (2 * 50)) = 2 * atan(0.24) = 27.023°
  it('full frame 50mm matches reference (±1%)', () => {
    const r = calculateFov(36, 24, 50, 1000, 6000, 4000);
    expect(r.hFovDeg).toBeCloseTo(39.598, 1);
    expect(r.vFovDeg).toBeCloseTo(27.023, 1);
  });

  // Diagonal FOV: diag = sqrt(36² + 24²) = 43.267mm
  // DFOV = 2 * atan(43.267 / 100) = 46.79°
  it('diagonal FOV full frame 50mm (±1%)', () => {
    const r = calculateFov(36, 24, 50, 1000, 6000, 4000);
    const expectedDiag = 2 * Math.atan(Math.sqrt(36 * 36 + 24 * 24) / 100) * (180 / Math.PI);
    expect(r.dFovDeg).toBeCloseTo(expectedDiag, 1);
  });

  // Coverage at 1000mm distance with full frame 50mm:
  // hCoverage = 2 * 1000 * tan(39.598/2 * pi/180) = 2 * 1000 * 0.36 = 720mm
  it('coverage at 1m distance (±1%)', () => {
    const r = calculateFov(36, 24, 50, 1000, 6000, 4000);
    expect(r.hCoverage).toBeCloseTo(720, 0);
    expect(r.vCoverage).toBeCloseTo(480, 0);
  });

  // GSD = hCoverage / resW = 720 / 6000 = 0.12 mm/px
  it('GSD at 1m (±1%)', () => {
    const r = calculateFov(36, 24, 50, 1000, 6000, 4000);
    expect(r.gsd).toBeCloseTo(0.12, 2);
  });

  // 1/2" sensor (IMX290), 8mm lens, 500mm distance
  // HFOV = 2 * atan(6.46 / 16) = 43.92°
  it('IMX290 + 8mm lens (±1%)', () => {
    const r = calculateFov(6.46, 3.63, 8, 500, 1920, 1080);
    const expectedH = 2 * Math.atan(6.46 / 16) * (180 / Math.PI);
    expect(r.hFovDeg).toBeCloseTo(expectedH, 1);
  });

  // Wide angle: full frame + 14mm
  // HFOV = 2 * atan(36/28) = 2 * atan(1.2857) ≈ 104.25°
  it('wide angle 14mm on full frame (±1%)', () => {
    const r = calculateFov(36, 24, 14, 1000, 6000, 4000);
    const expected = 2 * Math.atan(36 / 28) * (180 / Math.PI);
    expect(r.hFovDeg).toBeCloseTo(expected, 1);
  });
});

describe('minDistance', () => {
  // Target 250×175mm on full frame 50mm, fill=0.8
  // dH = 250 * 50 / (36 * 0.8) = 12500 / 28.8 = 434.03mm
  // dV = 175 * 50 / (24 * 0.8) = 8750 / 19.2 = 455.73mm
  // max = 455.73mm
  it('returns larger of H/V distance', () => {
    const d = minDistance(250, 175, 36, 24, 50, 0.8);
    expect(d).toBeCloseTo(455.73, 0);
  });

  it('fill=1.0 gives shorter distance', () => {
    const d80 = minDistance(250, 175, 36, 24, 50, 0.8);
    const d100 = minDistance(250, 175, 36, 24, 50, 1.0);
    expect(d100).toBeLessThan(d80);
  });
});
