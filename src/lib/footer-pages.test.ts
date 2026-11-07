/**
 * PAGES-1 — verify each rewritten footer page contains the approved h1
 * and two distinctive sentences from the copy, and that claims.ts values
 * are interpolated in returns and FAQ.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RETURN_WINDOW_DAYS,
  RA_VALID_DAYS,
  RESTOCKING_FEE_MIN,
  DEFECT_WARRANTY,
  REFUND_START_DAYS,
  LEAD_TIME_WEEKS,
  SHIP_COUNTRY_COUNT,
  INSPECTION_CLAIM,
} from './claims';

const ROOT = resolve(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

// ── Per-page: h1 + two distinctive sentences ────────────────────────

describe('returns.astro copy', () => {
  const src = read('src/pages/returns.astro');
  it('has the approved h1', () => expect(src).toContain('Returns &amp; refunds'));
  it('mentions RA workflow', () => expect(src).toContain('return authorization (RA) number'));
  it('mentions packing instructions', () => expect(src).toContain('pattern facing the top foam'));
});

describe('shipping.astro copy', () => {
  const src = read('src/pages/shipping.astro');
  it('has the approved h1', () => expect(src).toContain('Shipping, duties &amp; taxes'));
  it('mentions DAP explanation', () => expect(src).toContain('Delivered at Place'));
  it('mentions damaged parcels', () => expect(src).toContain('take photos before you unpack'));
});

describe('faq.astro copy', () => {
  const src = read('src/pages/faq.astro');
  it('has the approved h1', () => expect(src).toContain('Frequently asked questions'));
  it('links to email not contact page', () => expect(src).toContain('hello@calib.tools'));
});

describe('faq-groups.ts copy', () => {
  const src = read('src/lib/faq-groups.ts');
  it('has composite-vs-ceramic question', () => expect(src).toContain('Composite or ceramic'));
  it('has marker IDs question', () => expect(src).toContain('Which marker IDs are on my board'));
  it('has Shop Pay in payment answer', () => expect(src).toContain('Shop Pay'));
  it('does not mention PayPal', () => expect(src).not.toContain('PayPal'));
});

describe('files/index.astro copy', () => {
  const src = read('src/pages/files/index.astro');
  it('has the approved h1', () => expect(src).toContain('Files &amp; downloads'));
  it('has config & pattern files section', () => expect(src).toContain('Config &amp; pattern files'));
  it('has can\'t find something section', () => expect(src).toContain('find something'));
  it('does not have CODE_TO_NAME map', () => expect(src).not.toContain('CODE_TO_NAME'));
});

describe('verify/index.astro copy', () => {
  const src = read('src/pages/verify/index.astro');
  it('has the approved h1', () => expect(src).toContain('Look up a serial number'));
  it('explains what serial numbers are', () => expect(src).toContain('serial number on its label'));
});

describe('verify/[sn].astro not-found copy', () => {
  const src = read('src/pages/verify/[sn].astro');
  it('shows SN in heading', () => expect(src).toContain('No record for SN {sn}'));
  it('explains shipping lag', () => expect(src).toContain('brand-new order can take a day'));
});

describe('contact.astro copy', () => {
  const src = read('src/pages/contact.astro');
  it('has the approved h1', () => expect(src).toContain('>Contact<'));
  it('has technical questions section', () => expect(src).toContain('Technical questions'));
  it('has orders and returns section', () => expect(src).toContain('Orders and returns'));
});

describe('about.astro copy', () => {
  const src = read('src/pages/about.astro');
  it('has the approved h1', () => expect(src).toContain('About Calib.Tools'));
  it('has what-we-make section', () => expect(src).toContain('What we make'));
  it('mentions US company', () => expect(src).toContain('Calib.Tools LLC is a US company'));
});

describe('imprint.astro copy', () => {
  const src = read('src/pages/imprint.astro');
  it('has the approved h1', () => expect(src).toContain('>Legal notice<'));
  it('has trademarks section', () => expect(src).toContain('Trademarks'));
  it('has copyright section', () => expect(src).toContain('Patterns and files you create'));
});

describe('privacy.astro copy', () => {
  const src = read('src/pages/privacy.astro');
  it('has the approved h1', () => expect(src).toContain('>Privacy policy<'));
  it('mentions quote requests', () => expect(src).toContain('sent through Resend'));
  it('mentions review invitations', () => expect(src).toContain('Review invitations'));
  it('has California clause', () => expect(src).toContain('California residents'));
});

describe('reviews policy page removed', () => {
  it('no source file links to /reviews-policy/', () => {
    for (const f of ['src/lib/nav.ts', 'src/pages/index.astro', 'src/pages/privacy.astro', 'src/islands/ReviewsSection.tsx']) {
      expect(read(f)).not.toContain('/reviews-policy/');
    }
  });
  it('old URL redirects home', () => expect(read('public/_redirects')).toContain('/reviews-policy/ / 301'));
});

// ── Claims interpolation ────────────────────────────────────────────

describe('returns.astro interpolates claims', () => {
  const src = read('src/pages/returns.astro');
  it('uses RETURN_WINDOW_DAYS', () => expect(src).toContain('RETURN_WINDOW_DAYS'));
  it('uses RA_VALID_DAYS', () => expect(src).toContain('RA_VALID_DAYS'));
  it('uses RESTOCKING_FEE_MIN', () => expect(src).toContain('RESTOCKING_FEE_MIN'));
  it('uses DEFECT_WARRANTY', () => expect(src).toContain('DEFECT_WARRANTY'));
  it('uses REFUND_START_DAYS', () => expect(src).toContain('REFUND_START_DAYS'));
});

describe('faq-groups.ts interpolates claims', () => {
  const src = read('src/lib/faq-groups.ts');
  it('uses LEAD_TIME_WEEKS', () => expect(src).toContain('LEAD_TIME_WEEKS'));
  it('uses SHIP_COUNTRY_COUNT', () => expect(src).toContain('SHIP_COUNTRY_COUNT'));
  it('uses INSPECTION_CLAIM', () => expect(src).toContain('INSPECTION_CLAIM'));
  it('uses RETURN_WINDOW_DAYS', () => expect(src).toContain('RETURN_WINDOW_DAYS'));
  it('uses COMPOSITE_TOLERANCE', () => expect(src).toContain('COMPOSITE_TOLERANCE'));
  it('uses CERAMIC_ACCURACY', () => expect(src).toContain('CERAMIC_ACCURACY'));
});
