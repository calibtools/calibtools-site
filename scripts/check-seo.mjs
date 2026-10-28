#!/usr/bin/env node
/**
 * check-seo.mjs — postbuild SEO validator.
 * Fails the build on: missing/duplicate titles, bad description lengths, missing h1,
 * canonical issues, noindex-in-sitemap, broken JSON-LD, missing alt, duplicate FAQPage.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const DIST = resolve(process.env.CHECK_SEO_DIST || 'dist');
const ROOT = resolve(import.meta.dirname, '..');
const SITE = 'https://calib.tools';

// ── Allowlist ────────────────────────────────────────────────────────
const ALLOWLIST_PATH = resolve(ROOT, 'scripts/seo-allowlist.txt');
const allowlist = new Set();
if (existsSync(ALLOWLIST_PATH)) {
  for (const line of readFileSync(ALLOWLIST_PATH, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [path] = trimmed.split('\t');
    if (path) allowlist.add(path.trim());
  }
}

// ── Collect HTML files ───────────────────────────────────────────────
function findHtmlFiles(dir) {
  const results = [];
  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) results.push(full);
    }
  }
  walk(dir);
  return results;
}

// ── Parse sitemap ────────────────────────────────────────────────────
function parseSitemapUrls() {
  const urls = new Set();
  try {
    const sitemapFiles = readdirSync(DIST).filter(
      (f) => f.startsWith('sitemap') && f.endsWith('.xml') && f !== 'sitemap-index.xml',
    );
    for (const f of sitemapFiles) {
      const xml = readFileSync(join(DIST, f), 'utf-8');
      const locRegex = /<loc>([^<]+)<\/loc>/g;
      let m;
      while ((m = locRegex.exec(xml)) !== null) {
        urls.add(m[1]);
      }
    }
  } catch { /* no sitemap */ }
  return urls;
}

// ── Helpers ──────────────────────────────────────────────────────────
function extractTag(html, tag, scope) {
  if (scope === 'head') {
    // Only search within <head>...</head>
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    if (!headMatch) return [];
    html = headMatch[1];
  }
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const matches = [];
  let m;
  while ((m = regex.exec(html)) !== null) matches.push(m[1].trim());
  return matches;
}

function extractMeta(html, name) {
  const regex = new RegExp(`<meta\\s[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  const m = regex.exec(html);
  if (m) return m[1];
  const regex2 = new RegExp(`<meta\\s[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i');
  const m2 = regex2.exec(html);
  return m2 ? m2[1] : null;
}

function extractCanonical(html) {
  const m = html.match(/<link\s[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  if (m) return m[1];
  const m2 = html.match(/<link\s[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  return m2 ? m2[1] : null;
}

function extractJsonLd(html) {
  const regex = /<script\s[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const items = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    try {
      items.push(JSON.parse(m[1]));
    } catch {
      items.push({ __parseError: true, __raw: m[1].slice(0, 100) });
    }
  }
  return items;
}

function hasNoindex(html) {
  return /<meta\s[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html) ||
    /<meta\s[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(html);
}

function extractImgAlts(html) {
  const imgRegex = /<img\s[^>]*?\/?>/gi;
  const issues = [];
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    const tag = m[0];
    if (!/\balt\s*=/i.test(tag)) {
      issues.push(tag.slice(0, 80));
    }
  }
  return issues;
}

// ── Main ─────────────────────────────────────────────────────────────
const htmlFiles = findHtmlFiles(DIST);
const sitemapUrls = parseSitemapUrls();
const errors = [];
const table = [];

for (const file of htmlFiles) {
  const rel = relative(DIST, file);
  if (allowlist.has(rel)) continue;

  const html = readFileSync(file, 'utf-8');
  const urlPath = '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '');
  const fullUrl = `${SITE}${urlPath}`;
  const isNoindex = hasNoindex(html);

  // Title (only in <head>, not SVG <title> elements)
  const titles = extractTag(html, 'title', 'head');
  const titleText = titles[0] ?? '';
  const titleLen = titleText.length;

  if (titles.length === 0) errors.push({ file: rel, rule: 'title-missing', detail: 'No <title> tag' });
  if (titles.length > 1) errors.push({ file: rel, rule: 'title-duplicate', detail: `${titles.length} <title> tags` });
  if (!isNoindex && titleLen > 0 && titleLen > 60) errors.push({ file: rel, rule: 'title-long', detail: `${titleLen} chars (max 60)` });
  if (!isNoindex && titleLen > 0 && titleLen < 20) errors.push({ file: rel, rule: 'title-short', detail: `${titleLen} chars (min 20)` });

  // Description
  const desc = extractMeta(html, 'description');
  const descLen = desc?.length ?? 0;
  if (!isNoindex) {
    if (!desc) errors.push({ file: rel, rule: 'desc-missing', detail: 'No meta description' });
    if (desc && descLen < 70) errors.push({ file: rel, rule: 'desc-short', detail: `${descLen} chars (min 70)` });
    if (desc && descLen > 160) errors.push({ file: rel, rule: 'desc-long', detail: `${descLen} chars (max 160)` });
  }

  // H1 (strip inline SVGs before counting to avoid false matches)
  const htmlNoSvg = html.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  const h1s = extractTag(htmlNoSvg, 'h1');
  if (h1s.length !== 1) errors.push({ file: rel, rule: 'h1-count', detail: `${h1s.length} <h1> tags (expected 1)` });

  // Canonical
  const canonical = extractCanonical(html);
  if (!canonical) {
    errors.push({ file: rel, rule: 'canonical-missing', detail: 'No canonical link' });
  } else {
    const canonicalUrl = canonical.replace(/\/$/, '');
    const expectedUrl = fullUrl.replace(/\/$/, '');
    if (!canonicalUrl.startsWith(SITE)) {
      errors.push({ file: rel, rule: 'canonical-domain', detail: `Canonical "${canonical}" not on ${SITE}` });
    } else if (canonicalUrl !== expectedUrl) {
      errors.push({ file: rel, rule: 'canonical-mismatch', detail: `Canonical "${canonical}" does not match page URL "${fullUrl}"` });
    }
  }

  // noindex vs sitemap
  if (isNoindex && sitemapUrls.has(fullUrl)) {
    errors.push({ file: rel, rule: 'noindex-in-sitemap', detail: 'Page has noindex but appears in sitemap' });
  }

  // JSON-LD
  const ldItems = extractJsonLd(html);
  for (const ld of ldItems) {
    if (ld.__parseError) {
      errors.push({ file: rel, rule: 'jsonld-parse', detail: `JSON-LD parse error: ${ld.__raw}` });
      continue;
    }

    if (ld['@type'] === 'Product' || ld['@type'] === 'ProductGroup') {
      if (!ld.name) errors.push({ file: rel, rule: 'jsonld-product-name', detail: 'Product JSON-LD missing name' });
      if (!ld.image) errors.push({ file: rel, rule: 'jsonld-product-image', detail: 'Product JSON-LD missing image' });
      if (ld['@type'] === 'Product') {
        const offers = ld.offers;
        if (!offers) {
          errors.push({ file: rel, rule: 'jsonld-product-offers', detail: 'Product JSON-LD missing offers' });
        } else {
          if (!offers.price && !offers.lowPrice) errors.push({ file: rel, rule: 'jsonld-product-price', detail: 'Product offers missing price' });
          if (!offers.priceCurrency) errors.push({ file: rel, rule: 'jsonld-product-currency', detail: 'Product offers missing priceCurrency' });
          if (!offers.availability) errors.push({ file: rel, rule: 'jsonld-product-availability', detail: 'Product offers missing availability' });
        }
      }
      if (ld['@type'] === 'ProductGroup' && ld.hasVariant) {
        for (const variant of ld.hasVariant) {
          const vo = variant.offers;
          if (!vo) continue;
          if (!vo.price && !vo.lowPrice) errors.push({ file: rel, rule: 'jsonld-product-price', detail: `Variant "${variant.name}" offers missing price` });
          if (!vo.priceCurrency) errors.push({ file: rel, rule: 'jsonld-product-currency', detail: `Variant "${variant.name}" offers missing priceCurrency` });
          if (!vo.availability) errors.push({ file: rel, rule: 'jsonld-product-availability', detail: `Variant "${variant.name}" offers missing availability` });
        }
      }
      // aggregateRating shape validation
      if (ld['@type'] === 'ProductGroup' && ld.aggregateRating) {
        const ar = ld.aggregateRating;
        if (ar['@type'] !== 'AggregateRating') errors.push({ file: rel, rule: 'jsonld-aggregate-type', detail: 'aggregateRating @type must be AggregateRating' });
        if (typeof ar.ratingValue === 'undefined') errors.push({ file: rel, rule: 'jsonld-aggregate-rating', detail: 'aggregateRating missing ratingValue' });
        if (typeof ar.reviewCount === 'undefined') errors.push({ file: rel, rule: 'jsonld-aggregate-count', detail: 'aggregateRating missing reviewCount' });
        if (ar.bestRating !== '5' && ar.bestRating !== 5) errors.push({ file: rel, rule: 'jsonld-aggregate-best', detail: `aggregateRating bestRating must be 5, got ${ar.bestRating}` });
      }
      // review objects shape
      if (ld['@type'] === 'ProductGroup' && ld.review) {
        if (!Array.isArray(ld.review)) {
          errors.push({ file: rel, rule: 'jsonld-review-array', detail: 'review must be an array' });
        } else {
          for (const rv of ld.review) {
            if (rv['@type'] !== 'Review') errors.push({ file: rel, rule: 'jsonld-review-type', detail: 'review @type must be Review' });
            if (!rv.author) errors.push({ file: rel, rule: 'jsonld-review-author', detail: 'review missing author' });
            if (!rv.reviewRating) errors.push({ file: rel, rule: 'jsonld-review-rating', detail: 'review missing reviewRating' });
          }
        }
      }
    }
  }

  // Multiple FAQPage
  const faqCount = ldItems.filter((ld) => ld['@type'] === 'FAQPage').length;
  if (faqCount > 1) errors.push({ file: rel, rule: 'faq-duplicate', detail: `${faqCount} FAQPage JSON-LD blocks (max 1)` });

  // Images without alt
  const missingAlts = extractImgAlts(html);
  for (const tag of missingAlts) {
    errors.push({ file: rel, rule: 'img-alt', detail: `<img> without alt: ${tag}` });
  }

  // Table row
  table.push({ file: rel, titleLen, descLen, h1Count: h1s.length, noindex: isNoindex });
}

// Sitemap URLs that don't have a corresponding file in dist
for (const url of sitemapUrls) {
  const pathname = new URL(url).pathname;
  const distPath = pathname === '/'
    ? 'index.html'
    : `${pathname.replace(/\/$/, '')}/index.html`.replace(/^\//, '');
  if (!existsSync(join(DIST, distPath))) {
    const altPath = `${pathname.replace(/\/$/, '')}.html`.replace(/^\//, '');
    if (!existsSync(join(DIST, altPath))) {
      errors.push({ file: distPath, rule: 'sitemap-missing-file', detail: `Sitemap URL ${url} has no file in dist/` });
    }
  }
}

// ── robots.txt must not block favicon or android-chrome files ────────
{
  const robotsPath = join(DIST, 'robots.txt');
  if (existsSync(robotsPath)) {
    const robotsTxt = readFileSync(robotsPath, 'utf-8');
    const disallowRe = /^Disallow:\s*(.+)/gm;
    let dm;
    while ((dm = disallowRe.exec(robotsTxt)) !== null) {
      const path = dm[1].trim();
      if (/favicon/i.test(path) || /android-chrome/i.test(path)) {
        errors.push({ file: 'robots.txt', rule: 'robots-blocks-icons', detail: `Disallow ${path} blocks icon files` });
      }
    }
  }
}

// ── Print table ──────────────────────────────────────────────────────
console.log('\n[check-seo] Page audit:\n');
console.log('  ' + 'File'.padEnd(53) + 'Title'.padEnd(8) + 'Desc'.padEnd(8) + 'H1s'.padEnd(6) + 'NoIdx');
console.log('  ' + '-'.repeat(75));
for (const row of table.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(
    `  ${row.file.padEnd(53)}${String(row.titleLen).padEnd(8)}${String(row.descLen).padEnd(8)}${String(row.h1Count).padEnd(6)}${row.noindex ? 'yes' : ''}`,
  );
}

// ── Print errors ─────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error(`\n[check-seo] ${errors.length} SEO error(s) found:\n`);
  for (const e of errors) {
    console.error(`  ${e.file}  [${e.rule}] ${e.detail}`);
  }
  process.exit(1);
}

console.log(`\n[check-seo] OK — ${table.length} pages checked, no errors.`);
