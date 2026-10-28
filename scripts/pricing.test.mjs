import { describe, it, expect } from 'vitest';
import {
  preciseRound, computePriceEur, convertToUsd,
  fitPowerLaw, extrapolateCeramic, checkMonotonicity,
  ECB_EURUSD, CERAMIC_FIT,
} from './pricing.mjs';

describe('preciseRound', () => {
  it('returns the rounded value when last digit is good', () => {
    expect(preciseRound(121.025, 118, 124)).toBe(121);
  });

  it('nudges away from digit 9', () => {
    expect(preciseRound(149.225, 146, 153)).toBe(148);
  });

  it('nudges away from digit 0', () => {
    expect(preciseRound(210.0, 207, 213)).toBe(211);
  });

  it('nudges away from digit 5', () => {
    const result = preciseRound(135.0, 132, 138);
    expect([134, 136]).toContain(result);
  });

  it('respects floor bound', () => {
    expect(preciseRound(120.0, 120, 124)).toBe(121);
  });

  it('respects ceil bound', () => {
    expect(preciseRound(129.0, 126, 129)).toBe(128);
  });

  it('all results have a good last digit for a range of inputs', () => {
    for (let anchor = 50; anchor <= 500; anchor += 7) {
      const raw = anchor * 1.175;
      const result = preciseRound(raw, anchor * 1.15, anchor * 1.20);
      const lastDigit = ((result % 10) + 10) % 10;
      expect([1, 2, 3, 4, 6, 7, 8]).toContain(lastDigit);
    }
  });
});

describe('computePriceEur', () => {
  it('€103 anchor → €121', () => {
    expect(computePriceEur(103)).toBe(121);
  });

  it('€127 anchor → €148 (digit 9 nudged)', () => {
    expect(computePriceEur(127)).toBe(148);
  });

  it('€263 anchor → €308 (digit 9 nudged)', () => {
    expect(computePriceEur(263)).toBe(308);
  });

  it('€240 anchor → €282', () => {
    expect(computePriceEur(240)).toBe(282);
  });

  it('result always within [anchor×1.15, anchor×1.20]', () => {
    for (const anchor of [103, 108, 116, 120, 127, 134, 176, 203, 240, 263, 273, 680, 915]) {
      const result = computePriceEur(anchor);
      expect(result).toBeGreaterThanOrEqual(Math.floor(anchor * 1.15));
      expect(result).toBeLessThanOrEqual(Math.ceil(anchor * 1.20));
    }
  });
});

describe('convertToUsd', () => {
  it('€121 → $134', () => {
    expect(convertToUsd(121)).toBe(134);
  });

  it('all conversions have good last digits', () => {
    for (const eur of [121, 127, 136, 141, 148, 157, 163, 207, 238, 276, 282, 308, 321, 798, 1076, 1304, 1743]) {
      const result = convertToUsd(eur);
      const lastDigit = ((result % 10) + 10) % 10;
      expect([1, 2, 3, 4, 6, 7, 8]).toContain(lastDigit);
    }
  });
});

describe('fitPowerLaw', () => {
  it('returns negative exponent for ceramic (price/cm² decreases with area)', () => {
    expect(CERAMIC_FIT.b).toBeLessThan(0);
  });

  it('reconstructs the anchor points', () => {
    const { a, b } = CERAMIC_FIT;
    const p1 = a * Math.pow(93.5, b) * 93.5;
    const p2 = a * Math.pow(150, b) * 150;
    expect(Math.round(p1)).toBe(798);
    expect(Math.round(p2)).toBe(1076);
  });

  it('exponent is in a plausible range', () => {
    expect(CERAMIC_FIT.b).toBeGreaterThan(-1);
    expect(CERAMIC_FIT.b).toBeLessThan(0);
  });
});

describe('extrapolateCeramic', () => {
  it('185×110 is in ≈€1300 neighbourhood', () => {
    const areaCm2 = (185 * 110) / 100;
    const result = extrapolateCeramic(areaCm2, CERAMIC_FIT.a, CERAMIC_FIT.b);
    expect(result).toBeGreaterThan(1250);
    expect(result).toBeLessThan(1350);
  });

  it('230×140 is in ≈€1740 neighbourhood', () => {
    const areaCm2 = (230 * 140) / 100;
    const result = extrapolateCeramic(areaCm2, CERAMIC_FIT.a, CERAMIC_FIT.b);
    expect(result).toBeGreaterThan(1690);
    expect(result).toBeLessThan(1790);
  });

  it('extrapolated prices have good last digits', () => {
    for (const [w, h] of [[185, 110], [230, 140]]) {
      const areaCm2 = (w * h) / 100;
      const result = extrapolateCeramic(areaCm2, CERAMIC_FIT.a, CERAMIC_FIT.b);
      const lastDigit = ((result % 10) + 10) % 10;
      expect([1, 2, 3, 4, 6, 7, 8]).toContain(lastDigit);
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
      { sku: 'B', widthMm: 300, heightMm: 200, priceEur: 500 },
    ];
    expect(checkMonotonicity(rows).ok).toBe(false);
  });

  it('passes for ceramic family with extrapolated sizes', () => {
    const { a, b } = CERAMIC_FIT;
    const sizes = [[110, 85, 798], [150, 100, 1076]];
    for (const [w, h] of [[185, 110], [230, 140]]) {
      const areaCm2 = (w * h) / 100;
      sizes.push([w, h, extrapolateCeramic(areaCm2, a, b)]);
    }
    const rows = sizes.map(([w, h, p]) => ({ sku: `${w}×${h}`, widthMm: w, heightMm: h, priceEur: p }));
    expect(checkMonotonicity(rows).ok).toBe(true);
  });
});

describe('owner decisions', () => {
  it('certificate EUR from $307 / ECB rate has good last digit', () => {
    const rawEur = 307 / ECB_EURUSD;
    const eur = preciseRound(rawEur, rawEur - 3, rawEur + 3);
    const lastDigit = ((eur % 10) + 10) % 10;
    expect([1, 2, 3, 4, 6, 7, 8]).toContain(lastDigit);
    expect(eur).toBeGreaterThan(270);
    expect(eur).toBeLessThan(285);
  });

  it('fixture USD from €163 × ECB rate has good last digit', () => {
    const usd = convertToUsd(163);
    const lastDigit = ((usd % 10) + 10) % 10;
    expect([1, 2, 3, 4, 6, 7, 8]).toContain(lastDigit);
    expect(usd).toBeGreaterThan(175);
    expect(usd).toBeLessThan(190);
  });
});

describe('ECB rate', () => {
  it('is a plausible EUR/USD rate', () => {
    expect(ECB_EURUSD).toBeGreaterThan(1.0);
    expect(ECB_EURUSD).toBeLessThan(1.5);
  });
});
