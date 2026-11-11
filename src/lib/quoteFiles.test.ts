import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { markerIdsCsv, quoteAttachments, fileStem } from './quoteFiles';
import { factoryPdf, factoryPage } from './factoryPdf';
import { specFromLink, patternPath, patternId, GENERATOR_DEFAULT } from './patternLink';
import { charucoMarkers, renderCharucoSvg } from './renderCharuco';
import { aprilGridTags, renderAprilGridSvg } from './renderAprilGrid';
import { MM } from './exportPdf';
import type { PatternSpec } from './patterns';

const charuco: PatternSpec = { ...GENERATOR_DEFAULT, type: 'ChArUco', rows: 5, cols: 7, square: 25, marker: 18, dict: 'DICT_5X5_100', startId: 10 };
const april: PatternSpec = { ...GENERATOR_DEFAULT, type: 'AprilGrid (Kalibr)', rows: 4, cols: 6, square: 25, tagSpacing: 0.3, startId: 0 };
const checker: PatternSpec = { ...GENERATOR_DEFAULT, type: 'Checkerboard', rows: 7, cols: 10, square: 25 };
const b64 = (s: string) => Buffer.from(s, 'base64').toString('utf-8');

describe('specFromLink', () => {
  it('rebuilds the exact pattern from a generator link', () => {
    const spec = specFromLink(`https://calib.tools${patternPath(charuco)}`);
    expect(spec).not.toBeNull();
    expect(patternId(spec!)).toBe(patternId(charuco));
    expect(spec!.rows).toBe(5);
    expect(spec!.startId).toBe(10);
  });
  it('returns null for anything that is not a generator link with parameters', () => {
    expect(specFromLink('')).toBeNull();
    expect(specFromLink('https://example.com/tools/generator/?rows=5')).toBeNull();
    expect(specFromLink('/tools/generator/')).toBeNull();
  });
});

describe('marker positions come from the renderer', () => {
  it('ChArUco: one marker per white square, IDs row-major from the start ID', () => {
    const ms = charucoMarkers(charuco);
    expect(ms).toHaveLength(17);
    expect(ms.map((m) => m.id)).toEqual(Array.from({ length: 17 }, (_, i) => 10 + i));
    expect(ms[0]).toMatchObject({ row: 0, col: 1, x: 28.5, y: 3.5, size: 18 });
  });
  it('ChArUco: the drawing has a marker square at every listed position', () => {
    const svg = renderCharucoSvg(charuco, 0, 0);
    for (const m of charucoMarkers(charuco)) expect(svg).toContain(`<rect x="${m.x}" y="${m.y}" width="${m.size}" height="${m.size}" fill="#000"/>`);
  });
  it('AprilGrid: one tag per cell at tag size plus gap, and the drawing agrees', () => {
    const tags = aprilGridTags(april);
    expect(tags).toHaveLength(24);
    expect(tags[7]).toMatchObject({ id: 7, row: 1, col: 1, x: 32.5, y: 32.5, size: 25 });
    const svg = renderAprilGridSvg(april, 0, 0);
    for (const t of tags) expect(svg).toContain(`<rect x="${t.x}" y="${t.y}" width="${t.size}" height="${t.size}" class="tag-bg"`);
  });
});

describe('markerIdsCsv', () => {
  it('lists every ChArUco marker with its cell and position', () => {
    const lines = markerIdsCsv(charuco)!.trim().split('\n');
    expect(lines[0]).toBe('id,row,col,x_mm,y_mm,size_mm');
    expect(lines).toHaveLength(18);
    expect(lines[1]).toBe('10,0,1,28.5,3.5,18');
  });
  it('lists every AprilGrid tag', () => {
    expect(markerIdsCsv(april)!.trim().split('\n')).toHaveLength(25);
  });
  it('is absent for patterns without markers', () => {
    expect(markerIdsCsv(checker)).toBeNull();
  });
});

describe('quoteAttachments', () => {
  it('names the files after the quote and pattern and carries the board definition', () => {
    const files = quoteAttachments(charuco, 'Q-20261111-4K7M');
    const stem = `Q-20261111-4K7M_${patternId(charuco)}`;
    expect(fileStem('Q-20261111-4K7M', charuco)).toBe(stem);
    expect(files.map((f) => f.filename)).toEqual([`${stem}_opencv.json`, `${stem}_marker-ids.csv`]);
    const json = JSON.parse(b64(files[0].content));
    expect(json).toMatchObject({ rows: 5, cols: 7, square_mm: 25, marker_mm: 18, dictionary: 'DICT_5X5_100', start_id: 10 });
    expect(b64(files[1].content)).toBe(markerIdsCsv(charuco));
  });
  it('sends only the board definition for a checkerboard', () => {
    expect(quoteAttachments(checker, 'Q-20261111-4K7M').map((f) => f.filename)).toEqual([`Q-20261111-4K7M_${patternId(checker)}_opencv.json`]);
  });
});

describe('factoryPdf', () => {
  const dir = resolve(__dirname, '../assets/fonts');
  const buf = (f: string) => { const b = readFileSync(resolve(dir, f)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
  const fonts = { regular: buf('Geist-Regular.ttf'), semiBold: buf('Geist-SemiBold.ttf'), mono: buf('GeistMono-Regular.ttf') };

  it('page holds the whole pattern at 1:1 with room around it', async () => {
    for (const spec of [charuco, { ...charuco, rows: 9, cols: 12, square: 50, marker: 37 }]) {
      const page = factoryPage(spec);
      expect(page.layout.fit).toBe('single');
      const bytes = await factoryPdf(spec, fonts);
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
      const { width, height } = (await PDFDocument.load(bytes)).getPage(0).getSize();
      expect(width).toBeCloseTo(page.layout.pw * MM, 1);
      expect(height).toBeCloseTo(page.layout.ph * MM, 1);
      expect(Math.max(width, height) / MM).toBeGreaterThan(Math.max(spec.cols, spec.rows) * spec.square);
    }
  });
});
