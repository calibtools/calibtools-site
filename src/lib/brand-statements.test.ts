/**
 * BRAND-1 — vision, mission and one-liner live once in brand.ts, appear on
 * the About page, and feed the Organization JSON-LD. The rendered About page
 * (dist/) is checked when a build is present.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { VISION, MISSION, ONE_LINER } from './brand';
import { TAGLINE } from './claims';
import { ORGANIZATION_LD } from './seo';

const ROOT = resolve(import.meta.dirname, '../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('brand statements', () => {
  it('are the approved wording', () => {
    expect(VISION).toBe('A world where every machine that sees knows exactly what its pixels mean in the physical world.');
    expect(MISSION.startsWith('We make the physical references that turn pixels into millimeters')).toBe(true);
    expect(MISSION.endsWith('The tools stay free.')).toBe(true);
    expect(ONE_LINER.startsWith('Calib.Tools builds the bridge')).toBe(true);
  });

  it('one-liner fits a meta description', () => {
    expect(ONE_LINER.length).toBeGreaterThanOrEqual(120);
    expect(ONE_LINER.length).toBeLessThanOrEqual(160);
  });

  it('are referenced, not retyped, on the About page', () => {
    const src = read('src/pages/about.astro');
    expect(src).toContain('{VISION}');
    expect(src).toContain('{MISSION}');
    expect(src).toContain('{ONE_LINER}');
    expect(src).not.toContain('pixels into millimeters');
  });

  it('do not appear on the home page or product templates', () => {
    for (const rel of ['src/pages/index.astro', 'src/pages/targets/[handle].astro', 'src/pages/targets/collection/[collection].astro']) {
      const src = read(rel);
      expect(src).not.toMatch(/bridge between digital|pixels into millimeters|VISION|MISSION|ONE_LINER/);
    }
  });

  it('feed the Organization JSON-LD', () => {
    expect(ORGANIZATION_LD.description).toBe(ONE_LINER);
    expect(ORGANIZATION_LD.slogan).toBe(TAGLINE);
  });

  it('render on the built About page', () => {
    const built = resolve(ROOT, 'dist/about/index.html');
    if (!existsSync(built)) return;
    const html = readFileSync(built, 'utf-8');
    const text = html.replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
    expect(text).toContain(VISION);
    expect(text).toContain(MISSION);
    expect(text).toContain('Our vision');
    expect(text).toContain('Our mission');
    expect(text).toContain(`"slogan":"${TAGLINE}"`);
  });
});

describe('home headline', () => {
  it('fits a browser title on its own', async () => {
    const { HOME_HEADLINE } = await import('./claims');
    expect(HOME_HEADLINE).toBe('Calibration targets and tools for Machine Vision');
    expect(HOME_HEADLINE.length).toBeLessThanOrEqual(60);
  });
});
