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
  it('contact page and legal notice show the company address from one constant', () => {
    for (const f of ['src/pages/contact.astro', 'src/pages/imprint.astro', 'src/pages/terms.astro']) expect(read(f)).toContain('COMPANY_ADDRESS');
    expect(COMPANY_ADDRESS).toMatch(/Sacramento, CA 95811/);
  });
  it('terms of sale are linked from the footer and the contact page', () => {
    expect(read('src/lib/nav.ts')).toContain("href: '/terms/'");
    expect(read('src/pages/contact.astro')).toContain('href="/terms/"');
  });
});
