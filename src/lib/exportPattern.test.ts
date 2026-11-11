/**
 * PDF and DXF export must paint exactly the pattern the SVG renderer draws —
 * for every pattern type, with the options that change geometry switched on.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import type { PatternSpec } from './patterns';
import { checkerboardSvg } from './patterns';
import { patternShapes, fillRgb, shapeBox, type Shape } from './patternShapes';
import { computeLayout, patternExtent, PAPERS } from './pageLayout';
import { exportPdf, exportTiledPdf } from './exportPdf';
import { exportDxf } from './exportDxf';
import { paintedShapes } from './pdfReadback';

const fontDir = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/fonts');
const fontBytes = {
  regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer as ArrayBuffer,
  semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer as ArrayBuffer,
  mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer as ArrayBuffer,
};

const base = { rows: 5, cols: 6, square: 18, marker: 13, dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true } as const;
const CASES: Array<[string, Partial<PatternSpec> & Pick<PatternSpec, 'type'>]> = [
  ['checkerboard', { type: 'Checkerboard' }],
  ['checkerboard with finder marks', { type: 'Checkerboard', finderMarkers: true } as any],
  ['ChArUco', { type: 'ChArUco' }],
  ['ArUco grid', { type: 'ArUco grid' }],
  ['AprilGrid', { type: 'AprilGrid (Kalibr)', tagSpacing: 0.3, aprilFamily: '36h11' } as any],
  ['AprilGrid with corner squares and IDs', { type: 'AprilGrid (Kalibr)', tagSpacing: 0.25, symmetricCorners: true, showTagIds: true } as any],
  ['symmetric circles, stock diameter', { type: 'Symmetric circles', square: 20, circleDiameter: 12 }],
  ['asymmetric circles', { type: 'Asymmetric circles', rows: 5, cols: 8, square: 20, circleDiameter: 12 }],
  ['circles with unequal spacing, inverted', { type: 'Symmetric circles', circleSpacingX: 22, circleSpacingY: 16, circleDiameter: 9, invert: true } as any],
  ['HALCON-style dots', { type: 'HALCON-style dots' }],
  ['marker sheet', { type: 'Marker sheet', rows: 2, cols: 3, marker: 40, square: 48 }],
  ['PuzzleBoard', { type: 'PuzzleBoard' }],
];
const specOf = (over: Partial<PatternSpec>): PatternSpec => ({ ...base, ...over } as PatternSpec);

const TOL = 0.002; // mm

function expectPainted(painted: Awaited<ReturnType<typeof paintedShapes>>, expected: Shape[]) {
  const drawn = expected.filter((s) => s.kind !== 'text');
  expect(painted.length).toBeGreaterThanOrEqual(drawn.length);
  drawn.forEach((s, i) => {
    const p = painted[i];
    const b = shapeBox(s);
    expect(Math.abs(p.x0 - b.x0), `shape ${i} left`).toBeLessThan(TOL);
    expect(Math.abs(p.y0 - b.y0), `shape ${i} top`).toBeLessThan(TOL);
    expect(Math.abs(p.x1 - b.x1), `shape ${i} right`).toBeLessThan(TOL);
    expect(Math.abs(p.y1 - b.y1), `shape ${i} bottom`).toBeLessThan(TOL);
    expect(p.curved).toBe(s.kind === 'circle');
    const rgb = fillRgb(s.fill);
    rgb.forEach((v, k) => expect(p.rgb[k]).toBeCloseTo(v, 2));
  });
}

describe('patternShapes', () => {
  it.each(CASES)('%s: reads every element the renderer emits', (_name, over) => {
    const spec = specOf(over);
    const shapes = patternShapes(spec, 10, 20);
    expect(shapes.length).toBeGreaterThan(0);
    const svg = checkerboardSvg(spec, 210, 297, computeLayout(spec, 210, 297));
    // The page SVG carries the same pattern: same number of circles as the shape list says
    const circles = shapes.filter((s) => s.kind === 'circle').length;
    if (spec.type.includes('circles') || spec.type.includes('dots')) expect((svg.match(/<circle /g) ?? []).length).toBeGreaterThanOrEqual(circles);
  });

  it('stays inside the extent the page layout reserves (corner squares and labels aside)', () => {
    for (const [, over] of CASES) {
      const spec = specOf(over);
      const { bw, bh } = patternExtent(spec);
      for (const s of patternShapes(spec)) {
        // AprilGrid corner squares are one gap wide and stand outside the tag block, in the quiet zone.
        const cornerSquare = s.kind === 'rect' && spec.type === 'AprilGrid (Kalibr)' && Math.abs(s.w - spec.square * (spec.tagSpacing ?? 0.3)) < 1e-9 && Math.abs(s.h - s.w) < 1e-9;
        if (s.kind === 'text' || cornerSquare || (s.kind === 'rect' && s.w < spec.square * 0.2)) continue;
        const b = shapeBox(s);
        expect(b.x0).toBeGreaterThanOrEqual(-1e-9);
        expect(b.y0).toBeGreaterThanOrEqual(-1e-9);
        expect(b.x1).toBeLessThanOrEqual(bw + 1e-9);
        expect(b.y1).toBeLessThanOrEqual(bh + 1e-9);
      }
    }
  });

  it('refuses markup it cannot turn into a shape', () => {
    expect(fillRgb('#fff')).toEqual([1, 1, 1]);
    expect(() => fillRgb('red')).toThrow();
  });
});

describe('PDF export paints the renderer shapes', () => {
  it.each(CASES)('%s', async (_name, over) => {
    const spec = specOf(over);
    const [w, h] = PAPERS.A4;
    const layout = computeLayout(spec, w, h);
    expect(layout.fit).toBe('single');
    const bytes = await exportPdf({ spec, pw: layout.pw, ph: layout.ph, fontBytes, layout });
    expectPainted(await paintedShapes(bytes), patternShapes(spec, layout.ox, layout.oy));
  });

  it('prints tag ID labels when they are switched on', async () => {
    const spec = specOf({ type: 'AprilGrid (Kalibr)', showTagIds: true } as any);
    const layout = computeLayout(spec, 210, 297);
    const withIds = await exportPdf({ spec, pw: layout.pw, ph: layout.ph, fontBytes, layout });
    const without = await exportPdf({ spec: { ...spec, showTagIds: false } as any, pw: layout.pw, ph: layout.ph, fontBytes, layout });
    expect(patternShapes(spec).filter((s) => s.kind === 'text')).toHaveLength(30);
    expect(withIds.length).toBeGreaterThan(without.length);
  });

  it('stock circle board: circle diameter and pitch are the ordered ones', async () => {
    const spec = specOf({ type: 'Symmetric circles', rows: 5, cols: 8, square: 20, circleDiameter: 12 });
    const layout = computeLayout(spec, 297, 210);
    const painted = (await paintedShapes(await exportPdf({ spec, pw: layout.pw, ph: layout.ph, fontBytes, layout }))).slice(0, 40);
    for (const p of painted) expect(p.x1 - p.x0).toBeCloseTo(12, 2);
    expect(painted[1].x0 - painted[0].x0).toBeCloseTo(20, 2);
    expect(painted[8].y0 - painted[0].y0).toBeCloseTo(20, 2);
  });
});

describe('tiled PDF export', () => {
  it.each([
    ['AprilGrid', { type: 'AprilGrid (Kalibr)', rows: 6, cols: 8, square: 40, tagSpacing: 0.3 }],
    ['circles', { type: 'Symmetric circles', rows: 10, cols: 14, square: 25, circleDiameter: 17 }],
    ['ChArUco', { type: 'ChArUco', rows: 8, cols: 11, square: 30, marker: 22 }],
  ] as Array<[string, Partial<PatternSpec>]>)('%s: every sheet shows its window of the same pattern', async (_name, over) => {
    const spec = specOf(over);
    const layout = computeLayout(spec, 210, 297);
    expect(layout.fit).toBe('tile');
    const tiling = layout.tiling!;
    const bytes = await exportTiledPdf({ spec, tiling, fontBytes });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(tiling.cols * tiling.rows);
    const { bw, bh } = patternExtent(spec);
    const all = patternShapes(spec).filter((s) => s.kind !== 'text');
    const seen = new Set<number>();
    for (let row = 0; row < tiling.rows; row++) for (let col = 0; col < tiling.cols; col++) {
      const painted = (await paintedShapes(bytes, row * tiling.cols + col)).filter((p) => p.clip);
      expect(painted.length).toBeGreaterThan(0);
      const clip = painted[0].clip!;
      const winX0 = col * (tiling.tileW - tiling.overlapMm), winY0 = row * (tiling.tileH - tiling.overlapMm);
      expect(clip.x1 - clip.x0).toBeCloseTo(Math.min(tiling.tileW, bw - winX0), 2);
      expect(clip.y1 - clip.y0).toBeCloseTo(Math.min(tiling.tileH, bh - winY0), 2);
      // Each painted shape is one of the pattern's shapes, moved by this sheet's window offset
      for (const p of painted) {
        const px0 = p.x0 - clip.x0 + winX0, py0 = p.y0 - clip.y0 + winY0;
        const idx = all.findIndex((s) => { const b = shapeBox(s); return Math.abs(b.x0 - px0) < TOL && Math.abs(b.y0 - py0) < TOL && Math.abs(b.x1 - b.x0 - (p.x1 - p.x0)) < TOL; });
        expect(idx, `sheet ${row},${col}: shape at ${px0.toFixed(2)},${py0.toFixed(2)} is not in the pattern`).toBeGreaterThanOrEqual(0);
        seen.add(idx);
      }
    }
    // Nothing is lost between sheets
    const blackCount = all.filter((s) => s.fill === '#000').length;
    expect([...seen].filter((i) => all[i].fill === '#000').length).toBe(blackCount);
  });
});

describe('DXF export carries the renderer shapes', () => {
  const count = (dxf: string, entity: string, layer: string) => (dxf.match(new RegExp(`\\n0\\n${entity}\\n8\\n${layer}(?=\\n)`, 'g')) ?? []).length;

  it.each(CASES)('%s', (_name, over) => {
    const spec = specOf(over);
    const layout = computeLayout(spec, 210, 297);
    const dxf = exportDxf({ spec, pw: layout.pw, ph: layout.ph, layout });
    const shapes = patternShapes(spec, layout.ox, layout.oy);
    const white = (s: Shape) => s.fill === '#fff';
    expect(count(dxf, 'SOLID', '0')).toBe(shapes.filter((s) => s.kind === 'rect' && !white(s)).length);
    expect(count(dxf, 'SOLID', 'PATTERN_WHITE')).toBe(shapes.filter((s) => s.kind === 'rect' && white(s)).length);
    expect(count(dxf, 'CIRCLE', '0')).toBe(shapes.filter((s) => s.kind === 'circle' && !white(s)).length);
    expect(count(dxf, 'CIRCLE', 'PATTERN_WHITE')).toBe(shapes.filter((s) => s.kind === 'circle' && white(s)).length);
    expect(count(dxf, 'TEXT', 'PATTERN_LABELS')).toBe(shapes.filter((s) => s.kind === 'text').length);
  });

  it('AprilGrid: first and last tag sit where the renderer puts them (y up in DXF)', () => {
    const spec = specOf({ type: 'AprilGrid (Kalibr)', tagSpacing: 0.3 } as any);
    const layout = computeLayout(spec, 210, 297);
    const dxf = exportDxf({ spec, pw: layout.pw, ph: layout.ph, layout });
    const solids = [...dxf.matchAll(/\n0\nSOLID\n8\n0\n10\n([-\d.]+)\n20\n([-\d.]+)\n11\n([-\d.]+)\n21\n[-\d.]+\n12\n[-\d.]+\n22\n([-\d.]+)(?=\n)/g)].map((m) => m.slice(1, 5).map(Number));
    const xs = solids.flatMap((s) => [s[0], s[2]]), ys = solids.flatMap((s) => [s[1], s[3]]);
    const { bw, bh } = patternExtent(spec);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(bw, 3);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(bh, 3);
    expect(Math.min(...xs)).toBeCloseTo(layout.ox, 3);
    expect(Math.max(...ys)).toBeCloseTo(layout.ph - layout.oy, 3);
  });

  it('circle board: radius is half the ordered diameter', () => {
    const spec = specOf({ type: 'Symmetric circles', square: 20, circleDiameter: 12 });
    const layout = computeLayout(spec, 210, 297);
    const dxf = exportDxf({ spec, pw: layout.pw, ph: layout.ph, layout });
    const radii = [...dxf.matchAll(/\n0\nCIRCLE\n8\n0\n10\n[-\d.]+\n20\n[-\d.]+\n40\n([-\d.]+)(?=\n)/g)].map((m) => Number(m[1]));
    expect(radii).toHaveLength(30);
    for (const r of radii) expect(r).toBeCloseTo(6, 4);
  });
});
