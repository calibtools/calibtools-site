/**
 * Tests for minimal QR code generator.
 */
import { describe, it, expect } from 'vitest';
import { generateQR } from './qr';

describe('generateQR', () => {
  it('generates a square boolean matrix', () => {
    const qr = generateQR('HELLO');
    expect(qr.length).toBeGreaterThan(0);
    for (const row of qr) {
      expect(row.length).toBe(qr.length);
    }
  });

  it('version 1 is 21×21', () => {
    const qr = generateQR('Hi'); // short enough for version 1
    expect(qr.length).toBe(21);
  });

  it('handles a verify URL', () => {
    const qr = generateQR('https://calib.tools/verify/000311');
    expect(qr.length).toBeGreaterThanOrEqual(21);
    // Has finder patterns in corners (top-left 7×7 should have dark border)
    expect(qr[0][0]).toBe(true);
    expect(qr[0][6]).toBe(true);
    expect(qr[6][0]).toBe(true);
    expect(qr[6][6]).toBe(true);
  });

  it('throws for data too long', () => {
    const long = 'x'.repeat(200);
    expect(() => generateQR(long)).toThrow('too long');
  });

  it('produces different output for different inputs', () => {
    const qr1 = generateQR('A');
    const qr2 = generateQR('B');
    const flat1 = qr1.flat().join('');
    const flat2 = qr2.flat().join('');
    expect(flat1).not.toBe(flat2);
  });
});
