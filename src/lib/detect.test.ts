import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { checkerboardSvg, type PatternSpec } from './patterns';
import { computeLayout, PAPERS } from './pageLayout';
import { GENERATOR_DEFAULT } from './patternLink';
import { markerIds } from './idRange';
import { detectPattern, detectorSettings, canCheck, CHECKABLE_TYPES, type RgbaImage } from './detect';
import { OPENCV_VERSION } from './opencv';

/**
 * The detection check, run for real: the generator draws a pattern, it is rendered to pixels, and the same
 * OpenCV.js build the site serves has to read every marker of it with the settings detect.ts derives.
 *
 * Until 2026-11-26 this file tested a count function only. The tool itself loaded a script that did not
 * exist and called functions the build did not have, and no test touched either.
 */

const base: PatternSpec = { ...GENERATOR_DEFAULT, paper: 'A3' };
const spec = (o: Partial<PatternSpec>): PatternSpec => ({ ...base, ...o });

async function render(s: PatternSpec, widthPx = 1500): Promise<RgbaImage> {
  const [w, h] = PAPERS[s.paper];
  const layout = computeLayout(s, w, h, 'auto');
  const svg = checkerboardSvg(s, layout.pw, layout.ph, layout);
  const { data, info } = await sharp(Buffer.from(svg), { density: 150 }).resize({ width: widthPx }).flatten({ background: '#fff' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

let cv: any;
beforeAll(async () => {
  const require = createRequire(import.meta.url);
  expect(require('@techstark/opencv-js/package.json').version.startsWith(OPENCV_VERSION)).toBe(true);
  const mod = require('@techstark/opencv-js');
  // The module has a then() of its own; awaiting it directly never ends. Hand it over inside an object.
  const box = await new Promise<{ cv: any }>((resolve) => {
    const done = (m: any) => { delete m.then; resolve({ cv: m }); };
    if (typeof mod.Mat === 'function') done(mod); else if (typeof mod.then === 'function') mod.then(done); else mod.onRuntimeInitialized = () => done(mod);
  });
  cv = box.cv;
}, 180_000);

describe('what the OpenCV.js build has', () => {
  it('the calls detect.ts makes', () => {
    for (const name of ['aruco_ArucoDetector', 'aruco_CharucoDetector', 'aruco_CharucoBoard', 'aruco_CharucoParameters', 'aruco_DetectorParameters', 'aruco_RefineParameters', 'getPredefinedDictionary', 'matFromArray', 'cvtColor', 'resize']) {
      expect(typeof cv[name], name).toBe('function');
    }
  });

  it('no checkerboard or circle-grid detector, which is why those types are not offered', () => {
    for (const name of ['findChessboardCorners', 'findChessboardCornersSB', 'findCirclesGrid']) expect(cv[name], name).toBeUndefined();
    expect(CHECKABLE_TYPES).toEqual(['ChArUco', 'ArUco grid', 'AprilGrid (Kalibr)', 'Marker sheet']);
    for (const t of ['Checkerboard', 'Symmetric circles', 'Asymmetric circles', 'HALCON-style dots', 'PuzzleBoard'] as const) {
      expect(canCheck(t)).toBe(false);
      expect(() => detectorSettings(spec({ type: t }))).toThrow('has none it can look for');
    }
  });

  it('every dictionary and tag family the generator offers', () => {
    for (const d of ['DICT_4X4_50', 'DICT_4X4_100', 'DICT_4X4_250', 'DICT_5X5_100', 'DICT_5X5_1000', 'DICT_6X6_250', 'DICT_7X7_1000', 'DICT_ARUCO_ORIGINAL', 'DICT_ARUCO_MIP_36h12', 'DICT_APRILTAG_16h5', 'DICT_APRILTAG_25h9', 'DICT_APRILTAG_36h11']) {
      expect(cv[d], d).toBeDefined();
    }
  });
});

describe('settings come from the pattern', () => {
  it.each([
    ['ChArUco', spec({ type: 'ChArUco', dict: 'DICT_5X5_100' }), 'DICT_5X5_100', 1],
    ['AprilGrid, default family and border', spec({ type: 'AprilGrid (Kalibr)' }), 'DICT_APRILTAG_36h11', 2],
    ['AprilGrid tag16h5, one-bit border', spec({ type: 'AprilGrid (Kalibr)', aprilFamily: '16h5', borderBits: 1, rows: 5, cols: 6 }), 'DICT_APRILTAG_16h5', 1],
    ['marker sheet with a tag family', spec({ type: 'Marker sheet', dict: 'DICT_6X6_250', aprilFamily: '25h9', borderBits: 2 }), 'DICT_APRILTAG_25h9', 2],
    ['marker sheet with an ArUco dictionary', spec({ type: 'Marker sheet', dict: 'DICT_4X4_50' }), 'DICT_4X4_50', 1],
  ] as const)('%s', (_n, s, dictionary, borderBits) => {
    expect(detectorSettings(s)).toMatchObject({ dictionary, borderBits, ids: markerIds(s) });
  });

  it('a dictionary the build does not know is an error, not another dictionary', async () => {
    const img = await render(spec({ type: 'ArUco grid', rows: 2, cols: 2, square: 40, marker: 30 }), 600);
    expect(() => detectPattern(cv, img, spec({ type: 'ArUco grid', rows: 2, cols: 2, dict: 'DICT_9X9_1' }))).toThrow('no dictionary DICT_9X9_1');
  });
});

describe('reads the generator\'s own patterns', () => {
  const boards: [string, PatternSpec][] = [
    ['ChArUco 5 × 7, DICT_6X6_250', spec({ type: 'ChArUco', rows: 5, cols: 7, square: 30, marker: 22 })],
    ['ChArUco, legacy layout, even rows', spec({ type: 'ChArUco', rows: 6, cols: 7, square: 30, marker: 22, legacyLayout: true })],
    ['ChArUco from ID 17, DICT_APRILTAG_36h11', spec({ type: 'ChArUco', rows: 5, cols: 7, square: 30, marker: 22, dict: 'DICT_APRILTAG_36h11', startId: 17 })],
    ['ArUco grid 4 × 5, DICT_5X5_100', spec({ type: 'ArUco grid', rows: 4, cols: 5, square: 40, marker: 30, dict: 'DICT_5X5_100' })],
    ['ArUco grid, DICT_ARUCO_MIP_36h12', spec({ type: 'ArUco grid', rows: 3, cols: 4, square: 40, marker: 30, dict: 'DICT_ARUCO_MIP_36h12' })],
    ['AprilGrid tag36h11, two-bit border', spec({ type: 'AprilGrid (Kalibr)', rows: 4, cols: 5, square: 40 })],
    ['AprilGrid tag16h5, one-bit border', spec({ type: 'AprilGrid (Kalibr)', rows: 4, cols: 5, square: 40, aprilFamily: '16h5', borderBits: 1 })],
    ['AprilGrid tag25h9 with an ID list', spec({ type: 'AprilGrid (Kalibr)', rows: 2, cols: 3, square: 50, aprilFamily: '25h9', tagIdList: '3,7,11-13,30' })],
    ['marker sheet tag25h9, two-bit border', spec({ type: 'Marker sheet', rows: 3, cols: 4, square: 40, marker: 40, aprilFamily: '25h9', borderBits: 2 })],
    ['marker sheet DICT_4X4_50 from ID 20', spec({ type: 'Marker sheet', rows: 2, cols: 3, square: 50, marker: 50, dict: 'DICT_4X4_50', startId: 20 })],
  ];

  it.each(boards)('%s', async (_n, s) => {
    const r = detectPattern(cv, await render(s), s);
    expect(r.missingIds).toEqual([]);
    expect(r.unexpectedIds).toEqual([]);
    expect(r.markersFound).toBe(markerIds(s)!.length);
    if (s.type === 'ChArUco') expect([r.cornersFound, r.cornersExpected]).toEqual([(s.rows - 1) * (s.cols - 1), (s.rows - 1) * (s.cols - 1)]);
    expect(r.found).toBe(true);
    expect(r.message).toMatch(/^Read all /);
    // outlines are in the photo's own pixels
    for (const m of r.markers) for (const [x, y] of m.corners) expect(x >= 0 && x <= 1500 && y >= 0).toBe(true);
  }, 60_000);

  it('a photo larger than the working size is scaled down and the points are scaled back', async () => {
    const s = boards[3][1];
    const small = detectPattern(cv, await render(s, 1500), s), large = detectPattern(cv, await render(s, 3600), s);
    expect(large.found).toBe(true);
    const a = small.markers.find((m) => m.id === 0)!.corners[0], b = large.markers.find((m) => m.id === 0)!.corners[0];
    expect(Math.abs(b[0] / 3600 - a[0] / 1500)).toBeLessThan(0.002);
    expect(Math.abs(b[1] / 3600 - a[1] / 1500)).toBeLessThan(0.002);
  }, 60_000);
});

describe('says what is wrong when the settings do not match the board', () => {
  it('wrong dictionary: nothing read, and the message points at the settings', async () => {
    const board = spec({ type: 'ArUco grid', rows: 4, cols: 5, square: 40, marker: 30, dict: 'DICT_5X5_100' });
    const r = detectPattern(cv, await render(board), { ...board, dict: 'DICT_6X6_250' });
    expect(r.found).toBe(false);
    expect(r.markersFound).toBe(0);
    expect(r.message).toContain('Check that the pattern settings match the board');
  }, 60_000);

  it('wrong start ID: markers are read, none belongs to the pattern', async () => {
    const board = spec({ type: 'ArUco grid', rows: 4, cols: 5, square: 40, marker: 30, startId: 0 });
    const r = detectPattern(cv, await render(board), { ...board, startId: 100 });
    expect(r.markersFound).toBe(0);
    expect(r.unexpectedIds).toHaveLength(20);
    expect(r.message).toContain('none with an ID of this pattern');
  }, 60_000);

  it('a tag36h11 AprilGrid checked as one-bit border is not read as complete', async () => {
    const board = spec({ type: 'AprilGrid (Kalibr)', rows: 4, cols: 5, square: 40 });
    const r = detectPattern(cv, await render(board), { ...board, borderBits: 1 });
    expect(r.found).toBe(false);
  }, 60_000);

  it('part of the board covered: the missing IDs are named', async () => {
    const board = spec({ type: 'ArUco grid', rows: 4, cols: 5, square: 40, marker: 30 });
    const img = await render(board);
    // paint the right half white
    for (let y = 0; y < img.height; y++) for (let x = Math.floor(img.width / 2); x < img.width; x++) { const i = 4 * (y * img.width + x); img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; }
    const r = detectPattern(cv, img, board);
    expect(r.found).toBe(false);
    expect(r.markersFound).toBeGreaterThan(0);
    expect(r.missingIds.length).toBe(20 - r.markersFound);
    expect(r.message).toBe(`Read ${r.markersFound} of 20 markers.`);
  }, 60_000);
});
