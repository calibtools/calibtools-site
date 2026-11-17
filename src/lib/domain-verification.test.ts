import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { domainVerificationProblem, META_DOMAIN_VERIFICATION } from '../../scripts/check-domain-verification.mjs';

const TAG = '<meta name="facebook-domain-verification" content="medo5c43zaicq35r04c4dvhq07g9ei" />';
const page = (head: string, body = '') => `<!doctype html><html><head><title>t</title>${head}</head><body>${body}</body></html>`;

describe('Meta domain verification tag', () => {
  it('keeps the exact value Meta issued', () => {
    expect(META_DOMAIN_VERIFICATION).toBe('medo5c43zaicq35r04c4dvhq07g9ei');
  });

  it('accepts the tag inside <head>', () => {
    expect(domainVerificationProblem(page(TAG))).toBeNull();
    // Astro may print the tag without the closing slash
    expect(domainVerificationProblem(page(TAG.replace(' />', '>')))).toBeNull();
  });

  it('rejects a missing tag, a changed value, a tag in <body> and a duplicate', () => {
    expect(domainVerificationProblem(page(''))).toMatch(/missing/);
    expect(domainVerificationProblem(page(TAG.replace('medo5', 'medo6')))).toMatch(/expected/);
    expect(domainVerificationProblem(page('', TAG))).toMatch(/outside/);
    expect(domainVerificationProblem(page(TAG + TAG))).toMatch(/2 times/);
  });

  it('the layout source carries the tag for every page', () => {
    const layout = readFileSync(resolve(__dirname, '../layouts/Base.astro'), 'utf-8');
    expect(layout).toContain(TAG);
  });

  // The built page is checked again after every build by scripts/check-domain-verification.mjs (postbuild).
  const built = resolve(__dirname, '../../dist/index.html');
  it.skipIf(!existsSync(built))('the built home page has the tag in <head>', () => {
    expect(domainVerificationProblem(readFileSync(built, 'utf-8'))).toBeNull();
  });
});
