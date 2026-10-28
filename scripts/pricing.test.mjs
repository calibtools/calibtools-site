import { describe, it, expect } from 'vitest';
import { preciseRound, computePriceEur, convertToUsd, checkMonotonicity, ECB_EURUSD } from './pricing.mjs';

describe('preciseRound', () => {
  it('returns the rounded value when last digit is good', () => {
    // 121.025 → 121, digit 1 = good
    expect(preciseRound(121.025, 118, 124)).toBe(121);
  });

  it('nudges away from digit 9', () => {
    // 149.225 → 149, digit 9 → nudge to 148 (digit 8)
    expect(preciseRound(149.225, 146, 153)).toBe(148);
  });

  it('nudges away from digit 0', () => {
    // 210.0 → 210, digit 0 → nudge to 211 (digit 1)
    expect(preciseRound(210.0, 207, 213)).toBe(211);
  });

  it('nudges away from digit 5', () => {
    // 135.0 → 135, digit 5 → nudge to 134 or 136
    const result = preciseRound(135.0, 132, 138);
    expect([134, 136]).toContain(result);
    expect(result % 10).not.toBe(5);
  });

  it('respects floor bound', () => {
    // 120.0 → 120, digit 0 → try 119 (digit 9, bad), 121 (digit 1, good)
    expect(preciseRound(120.0, 120, 124)).toBe(121);
  });

  it('respects ceil bound', () => {
    // 129.0 → 129, digit 9 → try 128 (digit 8, good)
    expect(preciseRound(129.0, 126, 129)).toBe(128);
  });

  it('all results have a good last digit for a range of inputs', () => {
    for (let anchor = 50; anchor <= 500; anchor += 7) {
      const raw = anchor * 1.175;
      const result = preciseRound(raw, anchor * 1.15, anchor * 1.20);
      const lastDigit = ((result % 10) + 10) % 10;
      expect(
        [1, 2, 3, 4, 6, 7, 8].includes(lastDigit),
        `anchor=${anchor} → result=${result}, bad digit ${lastDigit}`,
      ).toBe(true);
    }
  });
});

describe('computePriceEur', () => {
  it('computes correct price for €103 anchor (checkerboard 200×150)', () => {
    const result = computePriceEur(103);
    expect(result).toBeGreaterThanOrEqual(Math.floor(103 * 1.15));
    expect(result).toBeLessThanOrEqual(Math.ceil(103 * 1.20));
    expect(result).toBe(121); // 103 × 1.175 = 121.025 → 121
  });

  it('computes correct price for €127 anchor (checkerboard 400×300)', () => {
    const result = computePriceEur(127);
    // 127 × 1.175 = 149.225 → 149 → digit 9 → 148
    expect(result).toBe(148);
  });

  it('computes correct price for €263 anchor (checkerboard 800×600)', () => {
    const result = computePriceEur(263);
    // 263 × 1.175 = 309.025 → 309 → digit 9 → 308
    expect(result).toBe(308);
  });

  it('computes correct price for €240 anchor (fixture)', () => {
    const result = computePriceEur(240);
    // 240 × 1.175 = 282 → digit 2 → good
    expect(result).toBe(282);
  });

  it('result is always within [anchor×1.15, anchor×1.20]', () => {
    for (const anchor of [103, 108, 116, 120, 127, 134, 176, 203, 240, 263, 273, 680, 915]) {
      const result = computePriceEur(anchor);
      expect(result).toBeGreaterThanOrEqual(Math.floor(anchor * 1.15));
      expect(result).toBeLessThanOrEqual(Math.ceil(anchor * 1.20));
    }
  });
});

describe('convertToUsd', () => {
  it('converts EUR to USD with good last digit', () => {
    const usd = convertToUsd(121);
    // 121 × 1.1133 = 134.71 → 135 → digit 5 → 134 (closer to raw)
    expect(usd).toBe(134);
  });

  it('all conversions have good last digits', () => {
    for (const eur of [121, 127, 136, 141, 148, 157, 207, 238, 282, 308, 321]) {
      const result = convertToUsd(eur);
      const lastDigit = ((result % 10) + 10) % 10;
      expect(
        [1, 2, 3, 4, 6, 7, 8].includes(lastDigit),
        `EUR=${eur} → USD=${result}, bad digit ${lastDigit}`,
      ).toBe(true);
    }
  });
});

describe('checkMonotonicity', () => {
  it('passes for correctly decreasing price/cm²', () => {
    const rows = [
      { sku: 'A', widthMm: 200, heightMm: 150, priceEur: 121 },
      { sku: 'B', widthMm: 300, heightMm: 200, priceEur: 127 },
      { sku: 'C', widthMm: 400, heightMm: 300, priceEur: 148 },
    ];
    expect(checkMonotonicity(rows).ok).toBe(true);
  });

  it('fails when price/cm² increases with size', () => {
    const rows = [
      { sku: 'A', widthMm: 200, heightMm: 150, priceEur: 100 },
      { sku: 'B', widthMm: 300, heightMm: 200, priceEur: 500 }, // way too expensive
    ];
    expect(checkMonotonicity(rows).ok).toBe(false);
    expect(checkMonotonicity(rows).violations.length).toBe(1);
  });

  it('handles single-item family', () => {
    const rows = [{ sku: 'A', widthMm: 200, heightMm: 150, priceEur: 100 }];
    expect(checkMonotonicity(rows).ok).toBe(true);
  });
});

describe('ECB rate', () => {
  it('is a plausible EUR/USD rate', () => {
    expect(ECB_EURUSD).toBeGreaterThan(1.0);
    expect(ECB_EURUSD).toBeLessThan(1.5);
  });
});
