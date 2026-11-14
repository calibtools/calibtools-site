import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { kindOf, checkGeometry, checkDetection } from './check-image-batch.mjs';

describe('kindOf', () => {
  it('reads the kind from the file name or folder', () => {
    expect(kindOf('category-composite-boards.webp').kind).toBe('category');
    expect(kindOf('categories/ceramic-glass.webp').kind).toBe('category');
    expect(kindOf('charuco-composite/01-hero.webp').kind).toBe('product');
    expect(kindOf('04-in-use.webp').kind).toBe('product');
    expect(kindOf('applications/robotics-calibration.webp').kind).toBe('application');
    expect(kindOf('app-research-education-calibration.webp').kind).toBe('application');
    expect(kindOf('notes.webp')).toBeNull();
  });
});

describe('checkGeometry', () => {
  const ok = { relPath: '01-hero.webp', format: 'webp', width: 2304, height: 1536, bytes: 200_000 };
  it('passes a delivery-size WebP', () => {
    expect(checkGeometry(ok)).toEqual({ errors: [], warnings: [] });
  });
  it('fails a non-WebP and a wrong aspect', () => {
    expect(checkGeometry({ ...ok, format: 'png' }).errors[0]).toMatch(/not WebP/);
    expect(checkGeometry({ ...ok, height: 1300 }).errors[0]).toMatch(/is not 3:2/);
  });
  it('only warns for a small or heavy picture with the right aspect', () => {
    const r = checkGeometry({ ...ok, width: 990, height: 660, bytes: 500_000 });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toHaveLength(2);
  });
});

describe('checkDetection', () => {
  it('needs 80 % of each expected count and no foreign IDs', () => {
    expect(checkDetection({ expected: { corners: 70 }, found: { corners: 56 } })).toEqual([]);
    expect(checkDetection({ expected: { corners: 70 }, found: { corners: 55 } })).toHaveLength(1);
    expect(checkDetection({ expected: { markers: 44 }, found: { markers: 44, foreignMarkers: 2 } })).toHaveLength(1);
  });
});

describe('detect-pattern.py on a synthetic ChArUco board', () => {
  it('finds every marker and corner', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ct-detect-'));
    const img = join(dir, 'board.png');
    execFileSync('python3', ['-c', `
import cv2
d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_5X5_100)
b = cv2.aruco.CharucoBoard((11, 8), 1.0, 0.75, d)
cv2.imwrite(${JSON.stringify(img)}, b.generateImage((1100, 800), marginSize=40))
`]);
    const out = JSON.parse(execFileSync('python3', ['scripts/detect-pattern.py', img, 'charuco', '11', '8'], { encoding: 'utf-8' }));
    expect(out.found.markers).toBe(44);
    expect(out.found.corners).toBe(70);
    expect(checkDetection(out)).toEqual([]);
  });
});
