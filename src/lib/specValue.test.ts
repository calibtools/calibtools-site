import { describe, it, expect } from 'vitest';
import { splitSpecValue } from './specValue';

describe('splitSpecValue', () => {
  it('moves a bracketed condition out of the value', () => {
    expect(splitSpecValue('±0.3 mm + 0.2 mm/m (any corner to nominal grid, at 20 °C)')).toEqual({ value: '±0.3 mm + 0.2 mm/m', cond: 'any corner to nominal grid, at 20 °C' });
    expect(splitSpecValue('±2 µm (target; any feature to nominal, at 20 °C; measurement method to be published)').value).toBe('±2 µm');
  });
  it('splits a long value at its first comma', () => {
    expect(splitSpecValue('≤ 0.5 mm per meter, three-point support')).toEqual({ value: '≤ 0.5 mm per meter', cond: 'three-point support' });
    expect(splitSpecValue('Aluminum / LDPE / aluminum composite, 6 mm')).toEqual({ value: 'Aluminum / LDPE / aluminum composite', cond: '6 mm' });
  });
  it('leaves short values whole', () => {
    expect(splitSpecValue('200–800 mm')).toEqual({ value: '200–800 mm', cond: '' });
    expect(splitSpecValue('180 g')).toEqual({ value: '180 g', cond: '' });
    expect(splitSpecValue('3 or 5 faces, 300 mm')).toEqual({ value: '3 or 5 faces, 300 mm', cond: '' });
  });
});
