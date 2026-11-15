import { describe, it, expect } from 'vitest';
import { initialSelections, type Product } from './shopify';

const v = (id: number, size: string, dict: string) => ({
  id: `gid://shopify/ProductVariant/${id}`,
  selectedOptions: [{ name: 'Size', value: size }, { name: 'Dictionary', value: dict }],
});
const product = {
  options: [
    { name: 'Size', values: ['200×150', '800×600'] },
    { name: 'Dictionary', values: ['DICT_6X6_250', 'DICT_5X5_100'] },
  ],
  variants: [v(111, '200×150', 'DICT_6X6_250'), v(222, '800×600', 'DICT_5X5_100')],
} as unknown as Product;

describe('initialSelections', () => {
  it('starts from the first variant', () => {
    expect(initialSelections(product, '')).toEqual({ Size: '200×150', Dictionary: 'DICT_6X6_250' });
  });
  it('selects the variant named by ?variant= (Google Shopping links)', () => {
    expect(initialSelections(product, '?variant=222')).toEqual({ Size: '800×600', Dictionary: 'DICT_5X5_100' });
  });
  it('ignores an unknown or malformed variant id', () => {
    expect(initialSelections(product, '?variant=999').Size).toBe('200×150');
    expect(initialSelections(product, '?variant=22').Size).toBe('200×150');
    expect(initialSelections(product, '?variant=abc').Size).toBe('200×150');
  });
  it('still honors per-option params, which win over ?variant=', () => {
    expect(initialSelections(product, '?size=800x600').Size).toBe('800×600');
    expect(initialSelections(product, '?variant=222&dictionary=DICT_6X6_250'))
      .toEqual({ Size: '800×600', Dictionary: 'DICT_6X6_250' });
  });
});
