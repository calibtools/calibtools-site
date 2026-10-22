import { describe, it, expect } from 'vitest';
import { formatPrice, findVariant, buildCartLines, sanitizeHtml, extractSpecsFromHtml, type Variant } from './shopify';

describe('formatPrice', () => {
  it('EUR integer', () => expect(formatPrice('89.00', 'EUR')).toBe('€89'));
  it('EUR decimal', () => expect(formatPrice('89.50', 'EUR')).toBe('€89.50'));
  it('USD', () => expect(formatPrice('99.00', 'USD')).toBe('$99'));
  it('GBP', () => expect(formatPrice('79.99', 'GBP')).toBe('£79.99'));
  it('other currency', () => expect(formatPrice('100.00', 'JPY')).toBe('100.00 JPY'));
});

describe('findVariant', () => {
  const variants: Variant[] = [
    { id: 'v1', title: '200 × 150 / 6X6', sku: 'A', price: '€89', currencyCode: 'EUR', availableForSale: true, selectedOptions: [{ name: 'Size', value: '200 × 150' }, { name: 'Dictionary', value: 'DICT_6X6_250' }] },
    { id: 'v2', title: '300 × 200 / 6X6', sku: 'B', price: '€109', currencyCode: 'EUR', availableForSale: true, selectedOptions: [{ name: 'Size', value: '300 × 200' }, { name: 'Dictionary', value: 'DICT_6X6_250' }] },
    { id: 'v3', title: '200 × 150 / 5X5', sku: 'C', price: '€89', currencyCode: 'EUR', availableForSale: false, selectedOptions: [{ name: 'Size', value: '200 × 150' }, { name: 'Dictionary', value: 'DICT_5X5_100' }] },
  ];

  it('finds exact match', () => {
    const v = findVariant(variants, { Size: '300 × 200', Dictionary: 'DICT_6X6_250' });
    expect(v?.id).toBe('v2');
  });

  it('returns undefined when no match', () => {
    expect(findVariant(variants, { Size: '800 × 600', Dictionary: 'DICT_6X6_250' })).toBeUndefined();
  });

  it('matches unavailable variants', () => {
    const v = findVariant(variants, { Size: '200 × 150', Dictionary: 'DICT_5X5_100' });
    expect(v?.id).toBe('v3');
    expect(v?.availableForSale).toBe(false);
  });
});

describe('buildCartLines', () => {
  it('single product, no add-ons', () => {
    const lines = buildCartLines('v1', 2, []);
    expect(lines).toEqual([{ merchandiseId: 'v1', quantity: 2 }]);
  });

  it('product + add-ons', () => {
    const lines = buildCartLines('v1', 1, ['cert-v1', 'fixture-v1']);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({ merchandiseId: 'v1', quantity: 1 });
    expect(lines[1]).toEqual({ merchandiseId: 'cert-v1', quantity: 1 });
    expect(lines[2]).toEqual({ merchandiseId: 'fixture-v1', quantity: 1 });
  });
});

describe('sanitizeHtml', () => {
  it('strips script tags', () => {
    expect(sanitizeHtml('<p>Hello</p><script>alert(1)</script><p>World</p>'))
      .toBe('<p>Hello</p><p>World</p>');
  });

  it('strips nested script tags', () => {
    expect(sanitizeHtml('<script type="text/javascript">var x = 1;</script>'))
      .toBe('');
  });

  it('preserves normal HTML', () => {
    const html = '<h2>Specs</h2><table><tr><td>Material</td><td>Aluminium</td></tr></table>';
    expect(sanitizeHtml(html)).toBe(html);
  });
});

describe('extractSpecsFromHtml', () => {
  it('extracts table rows', () => {
    const html = '<table><tr><td>Substrate</td><td>Aluminium</td></tr><tr><td>Tolerance</td><td>0.3 mm</td></tr></table>';
    const specs = extractSpecsFromHtml(html);
    expect(specs).toEqual([['Substrate', 'Aluminium'], ['Tolerance', '0.3 mm']]);
  });

  it('returns null when no table', () => {
    expect(extractSpecsFromHtml('<p>No table here</p>')).toBeNull();
  });

  it('strips inner HTML tags from cells', () => {
    const html = '<table><tr><td><strong>Material</strong></td><td>6 mm <em>composite</em></td></tr></table>';
    const specs = extractSpecsFromHtml(html);
    expect(specs).toEqual([['Material', '6 mm composite']]);
  });
});

describe('fallback behaviour', () => {
  it('getProducts returns fallback products (no env)', async () => {
    // import.meta.env won't have real values in test
    const { getProducts } = await import('./shopify');
    const products = await getProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].handle).toBeTruthy();
    expect(products[0].url).toMatch(/^\/targets\//);
  });

  it('getCollections returns fallback collections (no env)', async () => {
    const { getCollections } = await import('./shopify');
    const collections = await getCollections();
    expect(collections.length).toBe(4);
    expect(collections[0].handle).toBe('composite-boards');
  });

  it('getProductByHandle returns fallback product (no env)', async () => {
    const { getProductByHandle } = await import('./shopify');
    const p = await getProductByHandle('charuco-composite');
    expect(p).not.toBeNull();
    expect(p!.title).toContain('ChArUco');
  });

  it('getProductByHandle returns null for unknown handle', async () => {
    const { getProductByHandle } = await import('./shopify');
    const p = await getProductByHandle('nonexistent-product');
    expect(p).toBeNull();
  });
});
