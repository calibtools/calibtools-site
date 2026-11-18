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
