import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Rule (2026-11-08, no ™ since 2026-11-09): header and footer use only the framed wordmark
// (positive on light, negative on dark, red dot); the C.T icon is the favicon only.
const read = (p: string) => readFileSync(p, 'utf-8');
const imgSrcs = (src: string) => [...src.matchAll(/\/brand\/[a-z0-9-]+\.svg/g)].map((m) => m[0]);

describe('header and footer logo', () => {
  for (const file of ['src/components/Logo.astro', 'src/components/Footer.astro']) {
    it(`${file} references only the framed wordmark`, () => {
      const srcs = imgSrcs(read(file));
      expect(srcs.length).toBeGreaterThan(0);
      for (const s of srcs) expect(['/brand/wordmark-framed-light.svg', '/brand/wordmark-framed-dark.svg']).toContain(s);
    });
  }

  it('framed wordmarks keep the red dot', () => {
    for (const f of ['public/brand/wordmark-framed-light.svg', 'public/brand/wordmark-framed-dark.svg']) {
      expect(read(f)).toMatch(/<rect x="3340\.00" y="-196\.00" width="196\.00" height="196\.00" fill="#E60012"\/>/);
    }
  });

  it('the logo files used on the site carry no ™', () => {
    for (const f of ['public/brand/wordmark-framed-light.svg', 'public/brand/wordmark-framed-dark.svg']) {
      expect(read(f)).not.toMatch(/with TM|™/);
    }
  });

  it('light is the positive mark (black), dark the negative (white)', () => {
    expect(read('public/brand/wordmark-framed-light.svg')).toContain('<g fill="#000000">');
    expect(read('public/brand/wordmark-framed-dark.svg')).toContain('<g fill="#FFFFFF">');
  });
});

describe('favicon', () => {
  it('favicon.svg is the brand-kit icon positive and is linked first', () => {
    expect(read('public/favicon.svg')).toContain('CALIB.TOOLS icon positive');
    const base = read('src/layouts/Base.astro');
    expect(base).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
  });

  it('the C.T icon files are not used anywhere in the page components', () => {
    const files = ['src/components/Logo.astro', 'src/components/Footer.astro', 'src/components/Nav.astro', 'src/layouts/Base.astro'];
    for (const f of files) expect(read(f)).not.toMatch(/icon-(light|dark)\.svg|lockup-(light|dark)\.svg/);
  });
});
