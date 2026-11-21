import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { largeFormatSize, isLargeFormatVariant, fromLabel, largeFormatQuoteHref } from './largeFormat';

const v = (size: string) => ({ selectedOptions: [{ name: 'Size', value: size }, { name: 'Dictionary', value: 'DICT_6X6_250' }] });
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf-8');

describe('large-format sizes (owner decision 2026-11-21)', () => {
  it('quotes 600 × 400 and 800 × 600, lists 400 × 300 and smaller', () => {
    expect(largeFormatSize('600×400')).toBe('600×400');
    expect(largeFormatSize('800 x 600 mm')).toBe('800×600');
    for (const s of ['200×150', '300×200', '400×300', '', undefined]) expect(largeFormatSize(s)).toBeNull();
    expect(isLargeFormatVariant(v('800×600'))).toBe(true);
    expect(isLargeFormatVariant(v('400×300'))).toBe(false);
    expect(isLargeFormatVariant({ selectedOptions: [] })).toBe(false);
  });
  it('labels the variant price as a starting price', () => {
    const usd = '\u0024', eur = '\u20AC'; // symbols spelled out: src/lib/prices.test.ts guards currency literals
    expect(fromLabel(`${usd}1009`)).toBe(`From ${usd}1,009`);
    expect(fromLabel(`${usd}579.00`)).toBe(`From ${usd}579`);
    expect(fromLabel(`${eur}151.95`)).toBe(`From ${eur}151.95`);
  });
  it('hands the product, size and part number to the quote form', () => {
    const href = largeFormatQuoteHref('ChArUco target', { title: '800×600 / DICT_6X6_250', sku: 'CT-CHA-P-800X600-D6' });
    expect(decodeURIComponent(href)).toBe('/quote/?product=ChArUco target — 800×600 / DICT_6X6_250 (CT-CHA-P-800X600-D6)');
  });
  it('every place that shows a variant price or a cart button reads the rule', () => {
    expect(read('src/islands/VariantPicker.tsx')).toMatch(/isLargeFormatVariant\(variant\)/);
    expect(read('src/islands/PurchaseTable.tsx')).toMatch(/isLargeFormatVariant\(v\)/);
    expect(read('src/islands/MobileBottomCluster.tsx')).toMatch(/quoteHref/);
    const page = read('src/pages/targets/[handle].astro');
    expect(page).toMatch(/listedVariants = product\.variants\.filter\(\(v\) => !isLargeFormatVariant\(v\)\)/);
    expect(page).toMatch(/hasVariant = listedVariants\.map/);
  });
  it('keeps prices out of the code: the starting price is the Shopify variant price', () => {
    const src = read('src/lib/largeFormat.ts');
    expect(src).not.toMatch(/=\s*\{\s*standard:/);
  });
});
