import { describe, it, expect } from 'vitest';
import {
  newQuoteId, isQuoteId, parseQuantity, isCountry, countryOptions, quoteHeadline, internalSubject,
  customerBody, confirmToken, checkConfirmToken, MATERIALS, type QuoteRecord,
} from './quote';

const rec: QuoteRecord = {
  id: 'Q-20261109-4K7M', ts: '2026-11-09T12:00:00.000Z', name: 'Ada', company: 'Example Imaging', email: 'ada@example.com',
  product: 'ChArUco 22 × 32, 12 / 8.4 mm, DICT_5X5_1000, start ID 0', material: 'glass', quantity: 2, boards: 1,
  country: 'FR', message: '', pattern: 'https://calib.tools/tools/generator/?rows=32&cols=22', source_page: '/tools/generator/',
  emailVerified: false, customerEmailSent: false,
};

describe('quote reference numbers', () => {
  it('formats Q-YYYYMMDD-XXXX from the UTC date with unambiguous characters', () => {
    const id = newQuoteId(new Date('2026-11-09T23:30:00Z'), () => new Uint8Array([0, 1, 29, 30]));
    expect(id).toBe('Q-20261109-23Z2');
    expect(isQuoteId(id)).toBe(true);
  });
  it('random ids always validate and avoid 0, O, 1, I, L, U', () => {
    for (let i = 0; i < 500; i++) {
      const id = newQuoteId();
      expect(isQuoteId(id)).toBe(true);
      expect(id.slice(11)).not.toMatch(/[01OILU]/);
    }
  });
  it('rejects lookalikes', () => {
    for (const bad of ['Q-2026119-4K7M', 'Q-20261109-4K7O', 'q-20261109-4K7M', 'Q-20261109-4K7M ', '<script>']) expect(isQuoteId(bad), bad).toBe(false);
  });
});

describe('form options', () => {
  it('quantity is a whole number 1–9999', () => {
    expect(parseQuantity('5')).toBe(5);
    expect(parseQuantity(' 9999 ')).toBe(9999);
    for (const bad of ['0', '-1', '1.5', '10000', 'ten', '']) expect(parseQuantity(bad), bad).toBeNull();
  });
  it('countries are valid codes with English names, sorted', () => {
    const opts = countryOptions();
    expect(opts.length).toBeGreaterThan(90);
    expect(opts.find((o) => o.code === 'FR')!.name).toBe('France');
    expect(opts.map((o) => o.name)).toEqual([...opts.map((o) => o.name)].sort((a, b) => a.localeCompare(b, 'en')));
    expect(isCountry('DE')).toBe(true);
    expect(isCountry('XX')).toBe(false);
  });
  it('offers composite, ceramic, glass and not sure', () => {
    expect(MATERIALS.map((m) => m.id)).toEqual(['composite', 'ceramic', 'glass', 'unsure']);
  });
});

describe('email texts', () => {
  it('internal subject carries number, pattern, material and quantity', () => {
    expect(internalSubject(rec)).toBe('Q-20261109-4K7M · ChArUco 22 × 32, 12 / 8.4 mm, DICT_5X5_1000, start ID 0 · glass · ×2');
    expect(quoteHeadline({ ...rec, boards: 3, quantity: 4 })).toContain('×4 sets of 3');
  });
  it('customer email has the reference, the confirmation link and no price', () => {
    const body = customerBody(rec, 'https://calib.tools/api/quote-confirm?q=Q-20261109-4K7M&t=abc');
    expect(body).toContain('Q-20261109-4K7M');
    expect(body).toContain('/api/quote-confirm?q=Q-20261109-4K7M');
    expect(body).toContain('France');
    expect(body).not.toMatch(/[$€]|\bprice\b/i);
  });
});

describe('confirmation token', () => {
  it('round-trips and rejects tampering', async () => {
    const t = await confirmToken('secret', rec.id);
    expect(t).toMatch(/^[0-9a-f]{32}$/);
    expect(await checkConfirmToken('secret', rec.id, t)).toBe(true);
    expect(await checkConfirmToken('other', rec.id, t)).toBe(false);
    expect(await checkConfirmToken('secret', 'Q-20261109-4K7N', t)).toBe(false);
    expect(await checkConfirmToken('secret', rec.id, t.replace(/.$/, (c) => (c === '0' ? '1' : '0')))).toBe(false);
  });
});
