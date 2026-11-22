import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SHIP_COUNTRIES, SHIP_COUNTRY_COUNT, COMPANY_ADDRESS } from './claims';

const read = (f: string) => readFileSync(f, 'utf-8');

// Google Merchant Center compares the site, the Shopify policies and the account; these keep the site honest.
describe('policies say the same thing everywhere', () => {
  it('ships to the Shopify shipping zones and counts them', () => {
    expect(SHIP_COUNTRY_COUNT).toBe(SHIP_COUNTRIES.length);
    expect(SHIP_COUNTRIES).toContain('South Korea');
    expect(new Set(SHIP_COUNTRIES).size).toBe(SHIP_COUNTRIES.length);
  });
  it('shipping page describes flat regional rates, not carrier rates', () => {
    const s = read('src/pages/shipping.astro');
    expect(s).toContain('flat rate per region');
    expect(s).not.toMatch(/carrier rate|actually costs to send/);
    expect(s).toContain('SHIP_COUNTRIES');
  });
  it('contact page and legal notice take the company address from one constant', () => {
    for (const f of ['src/pages/contact.astro', 'src/pages/imprint.astro']) expect(read(f)).toContain('COMPANY_ADDRESS');
    expect(COMPANY_ADDRESS).toMatch(/Albuquerque, NM 87110/);
  });
  it('terms of sale are linked from the footer and the contact page', () => {
    expect(read('src/lib/nav.ts')).toContain("href: '/terms/'");
    expect(read('src/pages/contact.astro')).toContain('href="/terms/"');
  });
});

describe('company address', () => {
  it('appears nowhere as a hand-typed old address', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of ['src/pages/privacy.astro', 'src/pages/imprint.astro', 'src/pages/contact.astro', 'src/pages/terms.astro', 'docs/offers/sample-offer.json']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/Sacramento|1401 21st|incorporated in California|laws of the State of California/);
    }
  });
});

describe('custom orders are final once paid (2026-11-21)', () => {
  const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf-8');
  it('says so in one sentence', async () => {
    const { CUSTOM_ORDER_FINAL } = await import('./orderTerms');
    expect(CUSTOM_ORDER_FINAL).toMatch(/can’t be canceled, returned or exchanged once it is paid/);
    expect(CUSTOM_ORDER_FINAL).toMatch(/repaired or replaced/);
  });
  it('uses that sentence on the returns page, in the terms, in the quotation PDF and on the order page', () => {
    for (const rel of ['src/pages/returns.astro', 'src/pages/terms.astro', 'src/lib/offerPdf.ts', 'src/islands/OrderDetail.tsx']) {
      expect(read(rel), rel).toContain('CUSTOM_ORDER_FINAL');
    }
  });
  it('carries the same words in the offer email template', async () => {
    const { CUSTOM_ORDER_FINAL } = await import('./orderTerms');
    const email = read('docs/offers/draft-order-invoice-offer.liquid').replace(/&rsquo;/g, '’');
    expect(email).toContain(CUSTOM_ORDER_FINAL);
    // The offer email the site sends takes the sentence from the constant.
    expect(read('src/lib/offerEmail.ts')).toContain('CUSTOM_ORDER_FINAL');
    expect(read('src/lib/offerEmail.ts')).not.toMatch(/canceled, returned or exchanged/);
  });
  it('offers paid repair for damage caused in use, with shipping both ways on the customer', async () => {
    const { PAID_REPAIR } = await import('./orderTerms');
    expect(PAID_REPAIR).toMatch(/repair the target for a fee/);
    expect(PAID_REPAIR).toMatch(/shipping both ways/);
    for (const rel of ['src/pages/returns.astro', 'src/pages/terms.astro', 'src/lib/offerPdf.ts', 'src/islands/OrderDetail.tsx']) {
      expect(read(rel), rel).toContain('PAID_REPAIR');
    }
  });
  it('says that paying accepts the quotation: on the quotation, in the offer email and in the terms', async () => {
    const { PAYMENT_ACCEPTS_QUOTATION } = await import('./orderTerms');
    expect(PAYMENT_ACCEPTS_QUOTATION).toMatch(/^Paying the order confirms/);
    expect(read('src/lib/offerPdf.ts')).toContain('PAYMENT_ACCEPTS_QUOTATION');
    expect(read('docs/offers/draft-order-invoice-offer.liquid')).toContain(PAYMENT_ACCEPTS_QUOTATION);
    expect(read('src/lib/offerEmail.ts')).toContain('PAYMENT_ACCEPTS_QUOTATION');
    expect(read('src/pages/terms.astro')).toMatch(/paying the order accepts the specification/);
  });
  it('product pages take the warranty and return window from the shared constants', () => {
    const page = read('src/pages/targets/[handle].astro');
    expect(page).toContain('DEFECT_WARRANTY');
    expect(page).toContain('RETURN_WINDOW_DAYS');
    expect(page).not.toMatch(/\b(2|two) years against/i);
    expect(page).not.toMatch(/'30 days, unused/);
  });
  it('no page still says a custom target can be returned', () => {
    for (const rel of ['src/pages/returns.astro', 'src/pages/terms.astro', 'src/pages/faq.astro']) {
      expect(read(rel), rel).not.toMatch(/Custom targets can be returned/i);
    }
  });
});
