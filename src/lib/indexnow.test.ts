import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INDEXNOW_KEY, sitemapEntries, sitemapIndexChildren, urlsToSubmit, payload } from '../../scripts/indexnow.mjs';

const urlset = `<?xml version="1.0"?><urlset><url><loc>https://calib.tools/</loc>
    <lastmod>2026-11-13</lastmod></url><url><loc>https://calib.tools/about/</loc>
    <lastmod>2026-11-18</lastmod></url><url><loc>https://calib.tools/applications/</loc></url></urlset>`;

describe('IndexNow', () => {
  it('serves the key file at the site root with the key as its only content', () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    const file = resolve(__dirname, '../../public', `${INDEXNOW_KEY}.txt`);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf-8').trim()).toBe(INDEXNOW_KEY);
  });

  it('reads URLs and lastmod dates from a sitemap, and child sitemaps from an index', () => {
    expect(sitemapEntries(urlset)).toEqual([
      { loc: 'https://calib.tools/', lastmod: '2026-11-13' },
      { loc: 'https://calib.tools/about/', lastmod: '2026-11-18' },
      { loc: 'https://calib.tools/applications/', lastmod: null },
    ]);
    expect(sitemapIndexChildren('<sitemapindex><sitemap><loc>https://calib.tools/sitemap-0.xml</loc></sitemap></sitemapindex>'))
      .toEqual(['https://calib.tools/sitemap-0.xml']);
  });

  it('submits only pages changed in the window, or everything with --all', () => {
    const entries = sitemapEntries(urlset);
    const now = new Date('2026-11-19T06:00:00Z');
    expect(urlsToSubmit(entries, { days: 2, now })).toEqual(['https://calib.tools/about/']);
    expect(urlsToSubmit(entries, { all: true, now })).toHaveLength(3);
    expect(urlsToSubmit(entries, { days: 2, now: new Date('2026-12-01T00:00:00Z') })).toEqual([]);
  });

  it('only sends calib.tools URLs, with the key location Bing checks', () => {
    const body = payload(['https://calib.tools/a/', 'https://evil.example/b/']);
    expect(body).toEqual({
      host: 'calib.tools',
      key: INDEXNOW_KEY,
      keyLocation: `https://calib.tools/${INDEXNOW_KEY}.txt`,
      urlList: ['https://calib.tools/a/'],
    });
  });
});
