/**
 * Tests for inspection stamp.
 */
import { describe, it, expect } from 'vitest';
import { stampSvg, productMarkSvg } from './stamp';

describe('stamp SVGs (source, pre-outlining)', () => {
  it('stampSvg contains no forbidden words', () => {
    const svg = stampSvg();
    expect(svg).not.toContain('Certified');
    expect(svg).not.toContain('Calibrated');
    expect(svg).not.toContain('Accredited');
  });

  it('stampSvg contains INSPECTED and CALIB.TOOLS', () => {
    const svg = stampSvg();
    expect(svg).toContain('INSPECTED');
    expect(svg).toContain('CALIB.TOOLS');
    expect(svg).toContain('DIMENSIONAL INSPECTION');
  });

  it('stampSvg is valid SVG at Ø 32 mm', () => {
    const svg = stampSvg();
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/<\/svg>$/);
    expect(svg).toContain('32mm');
  });

  it('stampSvg uses Geist Pixel for INSPECTED', () => {
    const svg = stampSvg();
    expect(svg).toMatch(/font-family.*Geist Pixel.*INSPECTED/s);
  });

  it('stampSvg ring text uses letter-spacing ≤ 0.12em', () => {
    const svg = stampSvg();
    const lsMatch = svg.match(/letter-spacing="([^"]+)"/);
    expect(lsMatch).not.toBeNull();
    const val = parseFloat(lsMatch![1]);
    expect(val).toBeLessThanOrEqual(0.12);
  });

  it('productMarkSvg is 25 × 10 mm', () => {
    const svg = productMarkSvg();
    expect(svg).toContain('25mm');
    expect(svg).toContain('10mm');
    expect(svg).toContain('INSPECTED');
    expect(svg).toContain('SN ______');
  });

  it('productMarkSvg contains no forbidden words', () => {
    const svg = productMarkSvg();
    expect(svg).not.toContain('Certified');
    expect(svg).not.toContain('Calibrated');
    expect(svg).not.toContain('Accredited');
  });
});
