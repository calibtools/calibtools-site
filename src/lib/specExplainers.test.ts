import { describe, it, expect } from 'vitest';
import {
  compositeToleranceAtSize,
  thermalExpansion,
  FLATNESS_EXPLAINER,
  ceramicVsCompositeRatio,
} from './specExplainers';

describe('specExplainers', () => {
  it('compositeToleranceAtSize(1200) = ±0.5 mm', () => {
    expect(compositeToleranceAtSize(1200)).toBe('±0.5 mm worst case at 1200 mm');
  });

  it('compositeToleranceAtSize(300) = ±0.4 mm', () => {
    expect(compositeToleranceAtSize(300)).toBe('±0.4 mm worst case at 300 mm');
  });

  it('thermalExpansion composite 1200 mm = 0.29 mm per 10 °C', () => {
    // 24 × 1.2 × 10 = 288 µm = 0.288 mm → 0.29 mm
    expect(thermalExpansion('composite', 1200)).toBe('0.29 mm change over 1200 mm per 10 °C');
  });

  it('thermalExpansion ceramic 185 mm = 13.32 µm per 10 °C', () => {
    // 7.2 × 0.185 × 10 = 13.32 µm
    expect(thermalExpansion('ceramic', 185)).toBe('13.32 µm change over 185 mm per 10 °C');
  });

  it('FLATNESS_EXPLAINER is a non-empty string', () => {
    expect(FLATNESS_EXPLAINER).toContain('single plane');
  });

  it('ceramicVsCompositeRatio = about 150× tighter', () => {
    expect(ceramicVsCompositeRatio()).toBe('about 150× tighter than composite');
  });
});
