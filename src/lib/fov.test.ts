import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { calculateFov, minDistance, convertFov, formatLength, SENSOR_PRESETS, ASPECT_RATIOS } from './fov';

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

import { requiredFocal, recommendBoard } from './fov';

describe('requiredFocal', () => {
  // Full frame 36 × 24, 1000 mm distance, want 720 × 480 coverage → 50 mm
  it('inverts calculateFov coverage', () => {
    expect(requiredFocal(36, 24, 1000, 720, 480)).toBeCloseTo(50, 6);
  });
  it('takes the shorter focal so both dimensions are covered', () => {
    // width needs 50 mm, height 600 mm needs 40 mm → 40
    expect(requiredFocal(36, 24, 1000, 720, 600)).toBeCloseTo(40, 6);
  });
  it('round-trips with calculateFov', () => {
    const f = requiredFocal(8.77, 6.6, 500, 400, 0);
    const r = calculateFov(8.77, 6.6, f, 500, 1920, 1200);
    expect(r.hCoverage).toBeCloseTo(400, 6);
  });
});

describe('recommendBoard', () => {
  it('IMX174 + 12 mm at 500 mm picks the 200 × 150 composite board', () => {
    const r = calculateFov(8.77, 6.6, 12, 500, 1920, 1200);
    const rec = recommendBoard(r.hCoverage, r.vCoverage, r.gsd);
    expect(rec.board.label).toBe('200 × 150');
    expect(rec.productPath).toBe('/targets/charuco-composite/');
    expect(rec.fill).toBeLessThanOrEqual(0.9);
    expect(rec.pxPerSquare).toBeCloseTo(25 / r.gsd, 6);
    expect(rec.decodable).toBe(true);
  });
  it('small field picks a ceramic board', () => {
    const rec = recommendBoard(180, 135, 0.1);
    expect(rec.productPath).toBe('/targets/charuco-ceramic/');
    expect(rec.fill).toBeLessThanOrEqual(0.9);
  });
  it('large field picks the 800 × 600 board', () => {
    const rec = recommendBoard(1400, 1000, 0.7);
    expect(rec.board.label).toBe('800 × 600');
  });
  it('field smaller than every board returns the smallest', () => {
    const rec = recommendBoard(50, 40, 0.03);
    expect(rec.board.label).toBe('110 × 85');
    expect(rec.fill).toBeGreaterThan(0.9);
  });
  it('flags markers too small to decode', () => {
    const rec = recommendBoard(4000, 3000, 2);
    expect(rec.decodable).toBe(false);
  });
});

describe('home page example', () => {
  const home = readFileSync('src/pages/index.astro', 'utf8');
  const island = readFileSync('src/islands/FovCalculator.tsx', 'utf8');

  it('the calculator opens with FOV_DEFAULTS and the home page computes its example from the same values', () => {
    for (const k of ['preset', 'sensorW', 'sensorH', 'resW', 'resH', 'focal', 'distance']) expect(island).toContain(`useState(FOV_DEFAULTS.${k})`);
    expect(home).toContain('calculateFov(fovIn.sensorW, fovIn.sensorH, fovIn.focal, fovIn.distance, fovIn.resW, fovIn.resH)');
    expect(home).toContain('recommendBoard(fovOut.hCoverage, fovOut.vCoverage, fovOut.gsd)');
    expect(home).toContain('<FovDiagram fov={fovOut}');
  });

  it('the opening example is a 365 × 275 mm field with a 200 × 150 mm board', () => {
    const r = calculateFov(8.77, 6.6, 12, 500, 1920, 1200);
    expect([r.hCoverage.toFixed(0), r.vCoverage.toFixed(0)]).toEqual(['365', '275']);
    expect(recommendBoard(r.hCoverage, r.vCoverage, r.gsd).board.label).toBe('200 × 150');
  });
});

describe('convertFov', () => {
  // Rectilinear lens: tan(angle / 2) is proportional to the sensor dimension it spans.
  it('agrees with calculateFov for a full-frame 50 mm lens (3:2)', () => {
    const ref = calculateFov(36, 24, 50, 1000, 6000, 4000);
    const fromH = convertFov(ref.hFovDeg, 'horizontal', 3, 2);
    expect(fromH.horizontal).toBeCloseTo(ref.hFovDeg, 6);
    expect(fromH.vertical).toBeCloseTo(ref.vFovDeg, 6);
    expect(fromH.diagonal).toBeCloseTo(ref.dFovDeg, 6);
    const fromD = convertFov(ref.dFovDeg, 'diagonal', 3, 2);
    expect(fromD.horizontal).toBeCloseTo(ref.hFovDeg, 6);
    expect(fromD.vertical).toBeCloseTo(ref.vFovDeg, 6);
    const fromV = convertFov(ref.vFovDeg, 'vertical', 3, 2);
    expect(fromV.horizontal).toBeCloseTo(ref.hFovDeg, 6);
  });

  it('90° horizontal at 16:9 is 58.72° vertical and 97.85° diagonal', () => {
    // tan(v/2) = tan(45°) × 9/16 = 0.5625 → v = 58.716°; tan(d/2) = √(16² + 9²)/16 = 1.14735 → d = 97.851°
    const r = convertFov(90, 'horizontal', 16, 9);
    expect(r.vertical).toBeCloseTo(58.716, 2);
    expect(r.diagonal).toBeCloseTo(97.851, 2);
  });

  it('a square frame has equal horizontal and vertical angles', () => {
    const r = convertFov(60, 'horizontal', 1, 1);
    expect(r.vertical).toBeCloseTo(60, 9);
    expect(r.diagonal).toBeGreaterThan(60);
  });

  it('returns NaN outside 0–180° or for a bad aspect ratio, never a wrong number', () => {
    for (const bad of [convertFov(0, 'horizontal', 16, 9), convertFov(180, 'horizontal', 16, 9), convertFov(200, 'diagonal', 16, 9), convertFov(60, 'horizontal', 0, 9), convertFov(NaN, 'vertical', 4, 3)]) {
      expect(Number.isNaN(bad.horizontal)).toBe(true);
      expect(Number.isNaN(bad.vertical)).toBe(true);
      expect(Number.isNaN(bad.diagonal)).toBe(true);
    }
  });

  it('offers the common aspect ratios', () => {
    expect(ASPECT_RATIOS.map((a) => a.label)).toEqual(['16:9', '4:3', '3:2', '1:1', '21:9']);
  });
});

describe('formatLength', () => {
  it('gives millimeters with inches below one meter', () => {
    expect(formatLength(365.4)).toBe('365.4 mm (14.39 in)');
    expect(formatLength(25.4)).toBe('25.4 mm (1.00 in)');
  });
  it('gives meters with feet from one meter up', () => {
    expect(formatLength(1000)).toBe('1.00 m (3.28 ft)');
    expect(formatLength(3048)).toBe('3.05 m (10.00 ft)');
  });
});

describe('sensor presets', () => {
  it('include the formats people outside machine vision search for', () => {
    for (const name of ['1/2.3" (action camera, drone)', 'Micro Four Thirds', 'APS-C (Sony, Nikon, Fuji)']) expect(SENSOR_PRESETS[name]).toBeDefined();
  });
  it('keep the opening preset and end with Custom', () => {
    expect(SENSOR_PRESETS['2/3" (IMX174)']).toEqual([8.77, 6.60, 1920, 1200]);
    expect(Object.keys(SENSOR_PRESETS).at(-1)).toBe('Custom');
  });
  it('have plausible numbers: positive, wider than tall, sorted by sensor width', () => {
    const rows = Object.entries(SENSOR_PRESETS).filter(([n]) => n !== 'Custom');
    for (const [, [w, h, rw, rh]] of rows) { expect(w).toBeGreaterThan(h); expect(h).toBeGreaterThan(0); expect(rw).toBeGreaterThanOrEqual(rh); }
    const widths = rows.map(([, v]) => v[0]);
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
  });
});

describe('FOV page copy', () => {
  const md = readFileSync('src/content/tools/fov.md', 'utf8');

  it('lens table rows match the calculator', () => {
    const rows = [...md.matchAll(/^\| (\d+) mm \| ([\d.]+)° \| ([\d.]+)° \|(?: ([\d.]+)° \|)?$/gm)];
    expect(rows).toHaveLength(12);
    for (const [, f, h, v, d] of rows) {
      const fullFrame = d !== undefined;
      const r = fullFrame ? calculateFov(36, 24, +f, 1000, 6000, 4000) : calculateFov(8.77, 6.6, +f, 1000, 1920, 1200);
      expect(r.hFovDeg.toFixed(1)).toBe(h);
      expect(r.vFovDeg.toFixed(1)).toBe(v);
      if (fullFrame) expect(r.dFovDeg.toFixed(1)).toBe(d);
    }
  });

  it('the converter example in the FAQ matches convertFov', () => {
    const r = convertFov(90, 'horizontal', 16, 9);
    expect(md).toContain(`${r.vertical.toFixed(1)}° vertical and ${r.diagonal.toFixed(1)}° diagonal`);
  });
});
