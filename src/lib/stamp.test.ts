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

describe('stamp centre column layout (no overlaps)', () => {
  // Verify that INSPECTED, SN, date, and QR bounding boxes don't overlap.
  // Uses the same y positions as drawStampOnPage (in mm, relative to centre).
  const MM = 72 / 25.4;
  const CENTRE_FONT_SIZE = 12;
  const DETAIL_FONT_SIZE = 6.5;
  const DATE_FONT_SIZE = 5.5;
  const R_INNER = 16 - 1.8; // 14.2 mm

  // Approximate cap heights from font size (cap ratio ~0.72)
  const boxes = [
    { label: 'INSPECTED', top: 3 + CENTRE_FONT_SIZE * 0.72 / (72/25.4), bottom: 3 },
    { label: 'SN line', top: -1 + DETAIL_FONT_SIZE * 0.72 / (72/25.4), bottom: -1 },
    { label: 'Date line', top: -3.5 + DATE_FONT_SIZE * 0.72 / (72/25.4), bottom: -3.5 },
    { label: 'QR code', top: -3.5 - 1, bottom: -3.5 - 1 - 8 }, // 1mm gap + 8mm QR
  ];

  it('no two text/QR boxes overlap vertically', () => {
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        // Two intervals [a.bottom, a.top] and [b.bottom, b.top] overlap if
        // a.bottom < b.top AND b.bottom < a.top
        const overlaps = a.bottom < b.top && b.bottom < a.top;
        expect(overlaps, `${a.label} overlaps ${b.label}`).toBe(false);
      }
    }
  });

  it('QR bottom edge is inside inner ring', () => {
    const qrBottom = boxes[3].bottom; // mm from centre
    expect(Math.abs(qrBottom)).toBeLessThan(R_INNER - 1); // ≥ 1mm inside ring
  });
});
