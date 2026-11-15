import { describe, it, expect } from 'vitest';
import { variesByFor, variantJsonLd, variantUrl } from './productJsonLd';
import type { Variant } from './shopify';

const v = (id: number, size: string, dict: string, price = '357.00'): Variant => ({
  id: `gid://shopify/ProductVariant/${id}`,
  title: `${size} / ${dict}`,
  sku: `CT-CHA-${id}`,
  price: `$${price}`,
  priceAmount: price,
  currencyCode: 'USD',
  availableForSale: true,
  selectedOptions: [{ name: 'Size', value: size }, { name: 'Dictionary', value: dict }],
});

const base = 'https://calib.tools/targets/charuco-composite/';

describe('variantUrl', () => {
  it('appends the numeric variant id, matching the Shopping link format', () => {
    expect(variantUrl(base, 'gid://shopify/ProductVariant/59617607516508'))
      .toBe('https://calib.tools/targets/charuco-composite/?variant=59617607516508');
  });
  it('falls back to the product URL when the id is not a Shopify variant gid', () => {
    expect(variantUrl(base, 'fallback-1')).toBe(base);
  });
});

describe('variesByFor', () => {
  it('maps Size to schema.org/size and pattern options to schema.org/pattern', () => {
    expect(variesByFor([{ name: 'Size' }, { name: 'Dictionary' }, { name: 'Finish' }]))
      .toEqual(['https://schema.org/size', 'https://schema.org/pattern']);
  });
});

describe('variantJsonLd', () => {
  const ld = variantJsonLd({
    variant: v(222, '800×600', 'DICT_5X5_100'),
    productTitle: 'ChArUco Calibration Target, Aluminum Composite',
    productUrl: base,
    groupId: 'charuco-composite',
    priceValidUntil: '2027-11-15',
  });

  it('links the variant to its group', () => {
    expect(ld.inProductGroupWithID).toBe('charuco-composite');
  });
  it('carries the values of the properties the group varies by', () => {
    expect(ld.size).toBe('800×600');
    expect(ld.pattern).toBe('DICT_5X5_100');
  });
  it('gives the offer a variant-specific URL and the variant price', () => {
    expect(ld.offers.url).toBe(`${base}?variant=222`);
    expect(ld.offers.price).toBe('357.00');
    expect(ld.offers.priceCurrency).toBe('USD');
    expect(ld.offers.availability).toBe('https://schema.org/InStock');
  });
  it('keeps the sku and a readable name', () => {
    expect(ld.sku).toBe('CT-CHA-222');
    expect(ld.name).toBe('ChArUco Calibration Target, Aluminum Composite — 800×600 / DICT_5X5_100');
  });
  it('omits size and pattern when the variant has no such option', () => {
    const fixture = variantJsonLd({
      variant: { ...v(333, 'x', 'y'), selectedOptions: [{ name: 'Title', value: 'Default Title' }] },
      productTitle: 'Mounting Fixture', productUrl: base, groupId: 'mounting-fixture', priceValidUntil: '2027-11-15',
    });
    expect(fixture.size).toBeUndefined();
    expect(fixture.pattern).toBeUndefined();
  });
});
