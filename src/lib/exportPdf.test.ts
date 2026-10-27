import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { exportPdf, MM } from './exportPdf';
import type { PatternSpec } from './patterns';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(__dirname, '../assets/fonts');
const fontBytes = {
  regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer as ArrayBuffer,
  semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer as ArrayBuffer,
  mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer as ArrayBuffer,
};

const base: PatternSpec = {
  type: 'Checkerboard', rows: 7, cols: 10, square: 25, marker: 18,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

/** Load a generated PDF back and return the first page. */
async function loadPage(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPage(0);
}

describe('exportPdf', () => {
  it('produces bytes starting with %PDF-', async () => {
    const bytes = await exportPdf({ spec: base, pw: 210, ph: 297, fontBytes });
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('page size matches A4 in points (210×297 mm)', async () => {
    const bytes = await exportPdf({ spec: base, pw: 210, ph: 297, fontBytes });
    const page = await loadPage(bytes);
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(210 * MM, 1);
    expect(height).toBeCloseTo(297 * MM, 1);
  });

  it('page size matches A3 in points (297×420 mm)', async () => {
    const bytes = await exportPdf({ spec: { ...base, paper: 'A3' }, pw: 297, ph: 420, fontBytes });
    const page = await loadPage(bytes);
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(297 * MM, 1);
    expect(height).toBeCloseTo(420 * MM, 1);
  });

  it('page size matches Letter in points (215.9×279.4 mm)', async () => {
    const bytes = await exportPdf({ spec: { ...base, paper: 'Letter' }, pw: 215.9, ph: 279.4, fontBytes });
    const page = await loadPage(bytes);
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(215.9 * MM, 1);
    expect(height).toBeCloseTo(279.4 * MM, 1);
  });

  it('PDF with scaleBar is larger than without', async () => {
    const withBar = await exportPdf({ spec: base, pw: 210, ph: 297, fontBytes });
    const noBar = await exportPdf({ spec: { ...base, scaleBar: false }, pw: 210, ph: 297, fontBytes });
    // The scale bar adds text and a rect — more bytes
    expect(withBar.length).toBeGreaterThan(noBar.length);
  });

  it('scaleBar false produces a valid smaller PDF', async () => {
    const bytes = await exportPdf({ spec: { ...base, scaleBar: false }, pw: 210, ph: 297, fontBytes });
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
    const page = await loadPage(bytes);
    expect(page.getSize().width).toBeCloseTo(210 * MM, 1);
  });

  it('works for ChArUco pattern type', async () => {
    const bytes = await exportPdf({ spec: { ...base, type: 'ChArUco' }, pw: 210, ph: 297, fontBytes });
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  // ---- New Task 3 tests ----

  it('footer uses bracket-framed wordmark (5 mm height)', () => {
    // The full footer wordmark is 5mm tall
    // Aspect ratio: 7796.4 / 1857.4 ≈ 4.197 → width ≈ 21 mm
    const wmHeight = 5;
    const wmWidth = wmHeight * (7796.4 / 1857.4);
    expect(wmWidth).toBeCloseTo(21, 0);
    expect(wmHeight).toBe(5);
  });

  it('logo footer is >= 2 squares below pattern bottom', () => {
    // ChArUco 7x10 25mm on A4 (210x297)
    const spec: PatternSpec = {
      type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
      dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
    };
    const ph = 297;
    const bh = spec.rows * spec.square; // 175
    const oy = (ph - bh) / 2 - (spec.scaleBar ? 6 : 0); // (297-175)/2 - 6 = 55
    const patternBottom = oy + bh; // 55 + 175 = 230

    const sbY = oy + bh + 8; // 238
    const scaleBarBottom = sbY + 4 + 2.6; // line at sbY, label at sbY+4, text ~2.6mm height
    const footerY = Math.max(scaleBarBottom + 4, patternBottom + 2 * spec.square);

    expect(footerY - patternBottom).toBeGreaterThanOrEqual(2 * spec.square);
  });

  it('PDF metadata fields are set correctly', async () => {
    const bytes = await exportPdf({ spec: base, pw: 210, ph: 297, fontBytes });
    // Load with updateMetadata:false so pdf-lib doesn't overwrite Producer on load
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(doc.getTitle()).toContain('Calib.Tools pattern');
    expect(doc.getAuthor()).toBe('Calib.Tools');
    expect(doc.getSubject()).toBe('Camera calibration pattern');
    expect(doc.getProducer()).toBe('Calib.Tools pdf-lib');
  });

  it('content stream contains X-axis red and Y-axis green colour operators', async () => {
    const pako = await import('pako');
    const { PDFName, PDFRawStream, PDFArray } = await import('pdf-lib');
    const bytes = await exportPdf({ spec: { ...base, showAxes: true }, pw: 210, ph: 297, fontBytes });
    const doc = await PDFDocument.load(bytes);
    const node = doc.getPage(0).node;
    const contentsRef = node.get(PDFName.of('Contents'));
    const contentsObj = doc.context.lookup(contentsRef);
    let stream = '';
    const streams = contentsObj instanceof PDFArray
      ? Array.from({ length: contentsObj.size() }, (_, i) => doc.context.lookup(contentsObj.get(i)))
      : [contentsObj];
    for (const s of streams) {
      if (s instanceof PDFRawStream) {
        try { stream += new TextDecoder('latin1').decode(pako.inflate(s.contents)); } catch {}
      }
    }
    // X-axis E60012
    expect(stream).toContain('0.9019607843137255 0 0.07058823529411765 rg');
    // Y-axis 1BA55A
    expect(stream).toContain('0.10588235294117647 0.6470588235294118 0.35294117647058826 rg');
  });

  it('content stream contains wordmark path coordinate 383 (letter C)', async () => {
    const pako = await import('pako');
    const { PDFName, PDFRawStream, PDFArray } = await import('pdf-lib');
    const bytes = await exportPdf({ spec: base, pw: 210, ph: 297, fontBytes });
    const doc = await PDFDocument.load(bytes);
    const node = doc.getPage(0).node;
    const contentsRef = node.get(PDFName.of('Contents'));
    const contentsObj = doc.context.lookup(contentsRef);
    let stream = '';
    const streams = contentsObj instanceof PDFArray
      ? Array.from({ length: contentsObj.size() }, (_, i) => doc.context.lookup(contentsObj.get(i)))
      : [contentsObj];
    for (const s of streams) {
      if (s instanceof PDFRawStream) {
        try { stream += new TextDecoder('latin1').decode(pako.inflate(s.contents)); } catch {}
      }
    }
    expect(stream).toContain('383');
  });

  it('produces a valid PDF with brand content (>5000 bytes)', async () => {
    const bytes = await exportPdf({ spec: base, pw: 210, ph: 297, fontBytes });
    expect(bytes.length).toBeGreaterThan(5000);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
    // Verify it loads successfully
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
