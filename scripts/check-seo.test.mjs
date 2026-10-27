import { describe, it, expect, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FIXTURE_DIR = resolve(ROOT, '.test-seo-dist');

function setupFixture(files) {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  for (const [relPath, content] of Object.entries(files)) {
    const full = join(FIXTURE_DIR, relPath);
    mkdirSync(resolve(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  if (!files['sitemap-0.xml']) {
    writeFileSync(
      join(FIXTURE_DIR, 'sitemap-0.xml'),
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
    );
  }
}

function runCheckSeo() {
  try {
    const out = execFileSync('node', ['scripts/check-seo.mjs'], {
      cwd: ROOT,
      encoding: 'utf-8',
      env: { ...process.env, CHECK_SEO_DIST: FIXTURE_DIR },
    });
    return { code: 0, output: out };
  } catch (e) {
    return { code: e.status, output: (e.stdout || '') + (e.stderr || '') };
  }
}

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

const validPage = [
  '<!doctype html><html><head>',
  '<title>Valid Page Title Here \u00b7 Calib.Tools</title>',
  '<meta name="description" content="This is a valid description that is long enough to pass the minimum length check for SEO validation purposes." />',
  '<link rel="canonical" href="https://calib.tools/" />',
  '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Calib.Tools"}</script>',
  '</head><body><h1>Valid Page</h1></body></html>',
].join('\n');

describe('check-seo', () => {
  it('passes on a valid page', () => {
    setupFixture({ 'index.html': validPage });
    const r = runCheckSeo();
    expect(r.code).toBe(0);
  });

  it('fails on missing title', () => {
    const html = validPage.replace(/<title>[^<]*<\/title>/, '');
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('title-missing');
  });

  it('fails on title > 60 chars', () => {
    const html = validPage.replace(
      'Valid Page Title Here \u00b7 Calib.Tools',
      'A'.repeat(61),
    );
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('title-long');
  });

  it('fails on title < 20 chars', () => {
    const html = validPage.replace(
      'Valid Page Title Here \u00b7 Calib.Tools',
      'Short',
    );
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('title-short');
  });

  it('fails on missing description', () => {
    const html = validPage.replace(/<meta name="description"[^>]*\/>/, '');
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('desc-missing');
  });

  it('fails on description < 70 chars', () => {
    const html = validPage.replace(
      /content="This is a valid description[^"]*"/,
      'content="Too short desc"',
    );
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('desc-short');
  });

  it('fails on description > 160 chars', () => {
    const html = validPage.replace(
      /content="This is a valid description[^"]*"/,
      `content="${'A'.repeat(161)}"`,
    );
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('desc-long');
  });

  it('fails on zero h1 tags', () => {
    const html = validPage.replace('<h1>Valid Page</h1>', '<h2>Not H1</h2>');
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('h1-count');
  });

  it('fails on multiple h1 tags', () => {
    const html = validPage.replace('<h1>Valid Page</h1>', '<h1>One</h1><h1>Two</h1>');
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('h1-count');
  });

  it('fails on missing canonical', () => {
    const html = validPage.replace(/<link rel="canonical"[^>]*\/>/, '');
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('canonical-missing');
  });

  it('fails on noindex page in sitemap', () => {
    const noindexPage = validPage.replace(
      '</head>',
      '<meta name="robots" content="noindex" />\n</head>',
    );
    const sitemap = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://calib.tools/</loc></url></urlset>';
    setupFixture({ 'index.html': noindexPage, 'sitemap-0.xml': sitemap });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('noindex-in-sitemap');
  });

  it('skips title/desc length checks on noindex pages', () => {
    const noindexPage = [
      '<!doctype html><html><head>',
      '<title>X</title>',
      '<meta name="robots" content="noindex" />',
      '<link rel="canonical" href="https://calib.tools/" />',
      '</head><body><h1>Page</h1></body></html>',
    ].join('\n');
    setupFixture({ 'index.html': noindexPage });
    const r = runCheckSeo();
    // Should not fail on title-short or desc-missing for noindex pages
    expect(r.output).not.toContain('title-short');
    expect(r.output).not.toContain('desc-missing');
  });

  it('fails on unparseable JSON-LD', () => {
    const html = validPage.replace(
      '{"@context":"https://schema.org","@type":"Organization","name":"Calib.Tools"}',
      '{bad json!!!}',
    );
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('jsonld-parse');
  });

  it('fails on Product JSON-LD missing name', () => {
    const productLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      image: 'https://calib.tools/img.jpg',
      offers: { '@type': 'Offer', price: '89', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
    });
    const html = validPage.replace(
      '{"@context":"https://schema.org","@type":"Organization","name":"Calib.Tools"}',
      productLd,
    );
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('jsonld-product-name');
  });

  it('fails on img without alt', () => {
    const html = validPage.replace('</body>', '<img src="/photo.jpg" /></body>');
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('img-alt');
  });

  it('passes on img with alt', () => {
    const html = validPage.replace('</body>', '<img src="/photo.jpg" alt="A photo" /></body>');
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).toBe(0);
  });

  it('fails on multiple FAQPage JSON-LD', () => {
    const faq = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}</script>';
    const html = validPage.replace('</head>', `${faq}${faq}</head>`);
    setupFixture({ 'index.html': html });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('faq-duplicate');
  });

  it('fails on sitemap URL with no dist file', () => {
    const sitemap = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://calib.tools/ghost-page/</loc></url></urlset>';
    setupFixture({ 'index.html': validPage, 'sitemap-0.xml': sitemap });
    const r = runCheckSeo();
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('sitemap-missing-file');
  });
});
