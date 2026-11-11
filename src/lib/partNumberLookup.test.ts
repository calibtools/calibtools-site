import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePartNumber, partNumberIndex, resolvePartNumber } from './partNumberLookup';

const csv = readFileSync(resolve(__dirname, '../../data/part-numbers.csv'), 'utf-8');
const index = partNumberIndex(csv);
const rows = csv.trim().split('\n').slice(1).map((l) => l.split(','));

describe('part number lookup (home page box)', () => {
  it('indexes active part numbers only', () => {
    expect(Object.keys(index).length).toBe(rows.filter((r) => r[1] === 'active').length);
    expect(index['CT-SVC-CERT-ILAC']).toBeUndefined(); // draft
  });

  it('sends every active part number to its own product page', () => {
    for (const r of rows.filter((x) => x[1] === 'active')) {
      const href = resolvePartNumber(r[0], index);
      expect(href, r[0]).toBeTruthy();
      expect(href!.startsWith(`/targets/${index[r[0]]}/`), `${r[0]} → ${href}`).toBe(true);
    }
  });

  it('preselects the variant for stock pattern targets', () => {
    expect(resolvePartNumber('CT-CHA-P-400X300-D5', index)).toBe('/targets/charuco-composite/?size=400%C3%97300&dictionary=DICT_5X5_100');
    expect(resolvePartNumber('CT-CHT-P-200X150-C', index)).toBe('/targets/checkerboard-composite/?size=200%C3%97150&pattern=Coarse');
    expect(resolvePartNumber('CT-HAL-P-300X200-STD', index)).toBe('/targets/halcon-composite/?size=300x200');
    expect(resolvePartNumber('CT-ACC-M-FIX14', index)).toBe('/targets/mounting-fixture/');
  });

  it('is forgiving about case, spaces and the multiplication sign', () => {
    expect(normalizePartNumber('  ct-cha-p-400×300-d5 ')).toBe('CT-CHA-P-400X300-D5');
    expect(resolvePartNumber('ct-cha-p 400 x 300 d5', index)).toBe(resolvePartNumber('CT-CHA-P-400X300-D5', index));
    expect(resolvePartNumber('CHA-P-400X300-D5', index)).toBe(resolvePartNumber('CT-CHA-P-400X300-D5', index));
  });

  it('accepts a part number without the variant when the size is unambiguous about the product', () => {
    expect(resolvePartNumber('CT-CHA-P-400X300', index)).toBe('/targets/charuco-composite/?size=400x300');
    expect(resolvePartNumber('CT-APR-P-600X400', index)).toBe('/targets/aprilgrid-composite/?size=600x400');
  });

  it('returns nothing for unknown or empty input', () => {
    expect(resolvePartNumber('', index)).toBeUndefined();
    expect(resolvePartNumber('CT-CHA-P-999X999-D5', index)).toBeUndefined();
    expect(resolvePartNumber('<script>', index)).toBeUndefined();
    expect(resolvePartNumber('CT-SVC-CERT-ILAC', index)).toBeUndefined();
  });
});
