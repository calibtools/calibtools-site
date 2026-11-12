import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { money, offerPdf, offerProblem, offerTotals, type OfferData } from './offerPdf';

const ROOT = resolve(import.meta.dirname, '../..');
const sample = (): OfferData => JSON.parse(readFileSync(resolve(ROOT, 'docs/offers/sample-offer.json'), 'utf8'));
const font = (f: string) => {
  const b = readFileSync(resolve(ROOT, 'public/fonts/pdf', f));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const fonts = () => ({ regular: font('Geist-Regular.ttf'), semiBold: font('Geist-SemiBold.ttf'), mono: font('GeistMono-Regular.ttf') });

describe('offer data', () => {
  it('accepts the sample', () => {
    expect(offerProblem(sample())).toBeNull();
  });
  it('names what is missing', () => {
    const cases: [string, (d: any) => void][] = [
      ['no', (d) => delete d.no],
      ['date', (d) => (d.date = '13/11/2026')],
      ['currency', (d) => (d.currency = 'usd')],
      ['seller', (d) => delete d.seller.address],
      ['customer', (d) => (d.customer.name = '')],
      ['items', (d) => (d.items = [])],
      ['item', (d) => (d.items[0].qty = 0)],
      ['item', (d) => (d.items[0].unitPrice = -1)],
      ['terms', (d) => delete d.terms],
      ['annex', (d) => (d.annex.specs = [])],
      ['signatory', (d) => delete d.signatory],
    ];
    for (const [want, change] of cases) {
      const d = sample();
      change(d);
      expect(offerProblem(d), want).toBe(want);
    }
    expect(offerProblem(null)).toBe('not an object');
  });
  it('leaves options out of the total and adds the one-time charge and shipping', () => {
    const d = sample();
    d.items = [
      { description: 'Target', qty: 2, unitPrice: 3280 },
      { description: 'Fixture', qty: 2, unitPrice: 450, option: true },
    ];
    d.nre = { description: 'Layout', price: 1850 };
    d.shipping = { label: 'Shipping (DAP)', price: 120.5 };
    expect(offerTotals(d)).toEqual({ items: 6560, total: 8530.5 });
    d.shipping = { label: 'Shipping (DAP)' };
    expect(offerTotals(d).total).toBe(8410);
    expect(money(8530.5)).toBe('8,530.50');
  });
});

describe('offer PDF', () => {
  it('draws two A4 pages with the quote number as title', async () => {
    const bytes = await offerPdf(sample(), fonts());
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28, 1);
    expect(height).toBeCloseTo(841.89, 1);
    expect(doc.getTitle()).toBe('Quotation Q-SAMPLE-0001');
    expect(bytes.length).toBeLessThan(200_000);
  });
  it('copes with long text and the largest allowed lists', async () => {
    const d = sample();
    d.items = Array.from({ length: 6 }, (_, i) => ({
      partNo: `CT-CHA-C-400300-6X6-${i}`,
      description: 'ChArUco target, ceramic, with a description long enough to wrap over several lines in its column',
      spec: ['400 × 300 mm · 15 / 11 mm', '18 × 24 squares · DICT_6X6_250'],
      qty: 2,
      unitPrice: 3280,
      leadTime: '6 weeks after drawing approval',
    }));
    d.nre = { description: 'Custom layout, drawing approval, and test plate', note: 'Released after written approval of the final drawing.', price: 1850 };
    d.annex.specs = Array.from({ length: 20 }, (_, i) => [`Parameter ${i}`, 'A value that is long enough to need a second line in a half-width column of the annex'] as [string, string]);
    const doc = await PDFDocument.load(await offerPdf(d, fonts()));
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
    expect(doc.getPageCount()).toBeLessThanOrEqual(4);
  });
  it('refuses incomplete data', async () => {
    const d = sample();
    (d as any).items = [];
    await expect(offerPdf(d, fonts())).rejects.toThrow('offer data: items');
  });
  it('signs the sample as the quotation signatory and names nobody else', () => {
    const d = sample();
    expect(d.signatory).toEqual({ name: 'Kevin Lee', title: 'Customer Success' });
    expect(d.seller.name).toBe('Calib.Tools');
    expect(d.customer.name).toBe('Sample Customer');
  });
});
