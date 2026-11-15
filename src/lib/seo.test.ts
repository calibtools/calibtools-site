import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { breadcrumbLd, autoBreadcrumbLd, ORGANIZATION_LD } from './seo';

describe('breadcrumbLd', () => {
  it('returns BreadcrumbList with correct structure', () => {
    const ld = breadcrumbLd([
      { name: 'Home', url: '/' },
      { name: 'Tools', url: '/tools/' },
      { name: 'Generator' },
    ]);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toHaveLength(3);
  });

  it('sets position starting at 1', () => {
    const ld = breadcrumbLd([{ name: 'Home', url: '/' }, { name: 'About' }]);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].position).toBe(2);
  });

  it('includes item URL for non-leaf items, omits for leaf', () => {
    const ld = breadcrumbLd([
      { name: 'Home', url: '/' },
      { name: 'Leaf' },
    ]);
    expect(ld.itemListElement[0].item).toBe('https://calib.tools/');
    expect(ld.itemListElement[1].item).toBeUndefined();
  });

  it('prepends site URL to relative paths', () => {
    const ld = breadcrumbLd([{ name: 'Tools', url: '/tools/' }, { name: 'X' }]);
    expect(ld.itemListElement[0].item).toBe('https://calib.tools/tools/');
  });
});

describe('autoBreadcrumbLd', () => {
  it('returns null for home page', () => {
    expect(autoBreadcrumbLd('/', 'Home')).toBeNull();
  });

  it('returns null for 404', () => {
    expect(autoBreadcrumbLd('/404', 'Not found')).toBeNull();
  });

  it('generates breadcrumbs for a tool page', () => {
    const ld = autoBreadcrumbLd('/tools/generator/', 'Pattern generator');
    expect(ld).not.toBeNull();
    expect(ld!['@type']).toBe('BreadcrumbList');
    expect(ld!.itemListElement).toHaveLength(3);
    expect(ld!.itemListElement[0].name).toBe('Home');
    expect(ld!.itemListElement[1].name).toBe('Free tools');
    expect(ld!.itemListElement[2].name).toBe('Pattern generator');
  });

  it('generates breadcrumbs for a nested page', () => {
    const ld = autoBreadcrumbLd('/targets/collection/composite-boards/', 'Aluminum Composite Targets');
    expect(ld).not.toBeNull();
    expect(ld!.itemListElement).toHaveLength(4);
  });
});

describe('ORGANIZATION_LD', () => {
  it('has required fields', () => {
    expect(ORGANIZATION_LD['@type']).toBe('Organization');
    expect(ORGANIZATION_LD.name).toBe('Calib.Tools');
    expect(ORGANIZATION_LD.url).toBe('https://calib.tools');
  });

  it('has sameAs with GitHub org URL', () => {
    expect(ORGANIZATION_LD.sameAs).toContain('https://github.com/calibtools');
  });

  it('has contactPoint with email', () => {
    expect(ORGANIZATION_LD.contactPoint.email).toBe('hello@calib.tools');
  });

  it('does not contain address or city', () => {
    expect(ORGANIZATION_LD.address).toBeUndefined();
    const json = JSON.stringify(ORGANIZATION_LD);
    expect(json).not.toContain('"address"');
    expect(json).not.toContain('"city"');
  });

  it('logo points to android-chrome-512x512.png', () => {
    expect(ORGANIZATION_LD.logo).toBe('https://calib.tools/android-chrome-512x512.png');
  });

  it('every absolute calib.tools URL (except sameAs) resolves to a file under public/ or dist/', () => {
    const PUBLIC = resolve(__dirname, '../../public');
    const DIST = resolve(__dirname, '../../dist');

    function extractUrls(obj: any, parentKey?: string): string[] {
      const urls: string[] = [];
      if (typeof obj === 'string' && obj.startsWith('https://calib.tools/') && parentKey !== 'sameAs') {
        urls.push(obj);
      } else if (Array.isArray(obj)) {
        for (const item of obj) urls.push(...extractUrls(item, parentKey));
      } else if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          if (k === 'sameAs') continue;
          urls.push(...extractUrls(v, k));
        }
      }
      return urls;
    }

    const urls = extractUrls(ORGANIZATION_LD);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const path = url.replace('https://calib.tools', '');
      if (path === '' || path === '/') continue; // root URL is fine
      const asFile = path.startsWith('/') ? path.slice(1) : path;
      const inPublic = existsSync(resolve(PUBLIC, asFile));
      const inDist = existsSync(resolve(DIST, asFile));
      const isDir = existsSync(resolve(DIST, asFile, 'index.html'));
      // A page route (e.g. /returns/) counts too, so the test does not depend on a prior build
      const route = asFile.replace(/\/$/, '');
      const isPage = route !== '' && (existsSync(resolve(__dirname, '../pages', `${route}.astro`)) || existsSync(resolve(__dirname, '../pages', route, 'index.astro')));
      expect(inPublic || inDist || isDir || isPage, `${url} → ${asFile} must exist in public/, dist/ or src/pages/`).toBe(true);
    }
  });
});

describe('ORGANIZATION_LD return policy', () => {
  it('matches the returns page constants and the ship-to list', async () => {
    const { ORGANIZATION_LD } = await import('./seo');
    const { RETURN_WINDOW_DAYS, SHIP_TO_COUNTRIES } = await import('./claims');
    const p = ORGANIZATION_LD.hasMerchantReturnPolicy;
    expect(p['@type']).toBe('MerchantReturnPolicy');
    expect(p.merchantReturnDays).toBe(RETURN_WINDOW_DAYS);
    expect(p.returnMethod).toBe('https://schema.org/ReturnByMail');
    expect(p.merchantReturnLink).toMatch(/\/returns\/$/);
    expect(p.applicableCountry).toEqual([...SHIP_TO_COUNTRIES]);
  });
  it('ship-to list has 40 unique countries and excludes HK and CN', async () => {
    const { SHIP_TO_COUNTRIES } = await import('./claims');
    expect(new Set(SHIP_TO_COUNTRIES).size).toBe(40);
    expect(SHIP_TO_COUNTRIES).not.toContain('HK');
    expect(SHIP_TO_COUNTRIES).not.toContain('CN');
  });
});
