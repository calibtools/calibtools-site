import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { exportPdf, MM } from './exportPdf';
import type { PatternSpec } from './patterns';

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
    const bytes = await exportPdf({ spec: base, pw: 210, ph: 297 });
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('page size matches A4 in points (210×297 mm)', async () => {
    const bytes = await exportPdf({ spec: base, pw: 210, ph: 297 });
    const page = await loadPage(bytes);
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(210 * MM, 1);
    expect(height).toBeCloseTo(297 * MM, 1);
  });

  it('page size matches A3 in points (297×420 mm)', async () => {
    const bytes = await exportPdf({ spec: { ...base, paper: 'A3' }, pw: 297, ph: 420 });
    const page = await loadPage(bytes);
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(297 * MM, 1);
    expect(height).toBeCloseTo(420 * MM, 1);
  });

  it('page size matches Letter in points (215.9×279.4 mm)', async () => {
    const bytes = await exportPdf({ spec: { ...base, paper: 'Letter' }, pw: 215.9, ph: 279.4 });
    const page = await loadPage(bytes);
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(215.9 * MM, 1);
    expect(height).toBeCloseTo(279.4 * MM, 1);
  });

  it('PDF with scaleBar is larger than without', async () => {
    const withBar = await exportPdf({ spec: base, pw: 210, ph: 297 });
    const noBar = await exportPdf({ spec: { ...base, scaleBar: false }, pw: 210, ph: 297 });
    // The scale bar adds text and a rect — more bytes
    expect(withBar.length).toBeGreaterThan(noBar.length);
  });

  it('scaleBar false produces a valid smaller PDF', async () => {
    const bytes = await exportPdf({ spec: { ...base, scaleBar: false }, pw: 210, ph: 297 });
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
    const page = await loadPage(bytes);
    expect(page.getSize().width).toBeCloseTo(210 * MM, 1);
  });

  it('works for ChArUco pattern type', async () => {
    const bytes = await exportPdf({ spec: { ...base, type: 'ChArUco' }, pw: 210, ph: 297 });
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
