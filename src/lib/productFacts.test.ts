import { describe, it, expect } from 'vitest';
import { productFacts, factsJsonLd } from './productFacts';

describe('product facts for structured data', () => {
  it('pairs decide-specs with chips and adds software and ordering', () => {
    const f = productFacts(
      { decideSpecs: ['Pattern', 'Backlight', 'Size'], chips: ['Checkerboard or ChArUco', 'White or 850/940 nm', 'A4 to A2'], compat: [{ tool: 'OpenCV' }, { tool: 'HALCON' }] },
      { madeToOrder: true },
    );
    expect(f.map((x) => x.label)).toEqual(['Pattern', 'Backlight', 'Size', 'Software', 'Ordering']);
    expect(f[1].value).toBe('White or 850/940 nm');
    expect(f[3].value).toBe('OpenCV, HALCON');
  });
  it('takes the values from the spec table when the page has one, not from the chips', () => {
    const data = { decideSpecs: ['Feature position tolerance', 'Substrate', 'Flatness'], chips: ['±0.3 mm + 0.2 mm/m', '6 mm', '200–800 mm'] };
    const keySpecs = [
      { label: 'Substrate', value: 'Aluminum / LDPE / aluminum composite, 6 mm' },
      { label: 'Flatness', value: '≤ 0.5 mm per meter, board supported on three points' },
    ];
    const f = productFacts(data, { madeToOrder: true, keySpecs });
    expect(f.slice(0, 2)).toEqual(keySpecs);
    expect(f.map((x) => x.value)).not.toContain('200–800 mm');
    expect(f.at(-1)?.label).toBe('Ordering');
  });
  it('the product page passes its key specs', async () => {
    const { readFileSync } = await import('node:fs');
    const page = readFileSync(new URL('../pages/targets/[handle].astro', import.meta.url), 'utf-8');
    expect(page).toMatch(/productFacts\([^)]*keySpecs/);
  });
  it('uses explicit facts when the content file has them', () => {
    const f = productFacts({ facts: [{ label: 'Band', value: '8–14 µm' }], decideSpecs: ['A', 'B', 'C'], chips: ['1', '2', '3'] });
    expect(f).toEqual([{ label: 'Band', value: '8–14 µm' }]);
  });
  it('returns nothing without chips, and nothing derived for stock products', () => {
    expect(productFacts({ decideSpecs: ['A', 'B', 'C'] }, { madeToOrder: true })).toEqual([]);
    // stock products: chips are card labels, not values of the decide-specs
    expect(productFacts({ decideSpecs: ['Substrate'], chips: ['6 mm'] })).toEqual([]);
  });
  it('writes schema.org PropertyValue items', () => {
    expect(factsJsonLd([{ label: 'Band', value: '8–14 µm' }])).toEqual([{ '@type': 'PropertyValue', name: 'Band', value: '8–14 µm' }]);
  });
});
