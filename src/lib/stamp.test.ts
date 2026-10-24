/**
 * Tests for inspection stamp.
 */
import { describe, it, expect } from 'vitest';
import { stampSvg, productMarkSvg } from './stamp';

describe('stamp SVGs', () => {
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

  it('stampSvg is valid SVG', () => {
    const svg = stampSvg();
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/<\/svg>$/);
    expect(svg).toContain('32mm'); // Ø 32 mm
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
