#!/usr/bin/env node
/**
 * Live site scanner — checks deployed pages for blacklisted copy,
 * broken links, missing metadata, and placeholder text.
 *
 * Usage: node scripts/live-scan.mjs https://calib.tools
 * Reads sitemap, fetches each page (concurrency <= 4), reports issues.
 * Exit code 1 if any violations found.
 */

// ── Blacklist rules (kept in sync with src/lib/claims-blacklist.ts) ─

const BLACKLIST_RULES = [
  {
    label: '"inspection report" with "included/includes"',
    pattern: /(?:inspection\s+report.*?\b(?:included|includes)\b|(?:included|includes)\b.*?inspection\s+report|\bincluded\s+inspection\b)/i,
  },
  { label: '"ships from Germany"', pattern: /\bships\s+from\s+Germany\b/i },
  { label: '"Munich"', pattern: /\bMunich\b/i },
  { label: '"made in Germany"', pattern: /\bmade\s+in\s+Germany\b/i },
  { label: '"ISO 17025 certified"', pattern: /\bISO\s+17025\s+certified\b/i },
  { label: '"accredited" + "certificate included"', pattern: /\baccredited\b.*?\bcertificate\s+included\b/i },
  { label: '"calib tools" (brand misuse)', pattern: /\bcalib\s+tools\b/ },
  { label: 'bracketed ALL-CAPS placeholder', pattern: /\[[A-Z][A-Z\s]{2,}\]/ },
  { label: '"[BODY COPY]"', pattern: /\[BODY\s+COPY\]/i },
  { label: '"Lorem ipsum"', pattern: /\bLorem\s+ipsum\b/i },
  { label: '"TODO" in copy', pattern: /\bTODO\b/ },
];

// BLOCKED_NAMES from env
const blockedNames = process.env.BLOCKED_NAMES;
if (blockedNames) {
  for (const name of blockedNames.split(',').map((n) => n.trim()).filter(Boolean)) {
    BLACKLIST_RULES.push({
      label: 'blocked name',
      pattern: new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
    });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

const UA = 'calibtools-live-scan';
const CONCURRENCY = 4;

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  return { status: res.status, html: res.ok ? await res.text() : '' };
}

async function getSitemapUrls(baseUrl) {
  const tryUrls = [
    new URL('/sitemap-index.xml', baseUrl).href,
    new URL('/sitemap.xml', baseUrl).href,
  ];
  let text = '';
  for (const u of tryUrls) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': UA } });
      if (res.ok) { text = await res.text(); break; }
    } catch { /* try next */ }
  }
  if (!text) return [];

  const locRe = /<loc>\s*(.*?)\s*<\/loc>/g;
  const urls = [];
  let m;
  while ((m = locRe.exec(text)) !== null) urls.push(m[1]);

  // Sitemap index → fetch child sitemaps
  const childSitemaps = urls.filter((u) => u.endsWith('.xml'));
  const pageUrls = urls.filter((u) => !u.endsWith('.xml'));

  for (const child of childSitemaps) {
    try {
      const res = await fetch(child, { headers: { 'User-Agent': UA } });
      const childText = await res.text();
      const childRe = /<loc>\s*(.*?)\s*<\/loc>/g;
      let cm;
      while ((cm = childRe.exec(childText)) !== null) pageUrls.push(cm[1]);
    } catch { /* skip */ }
  }
  return pageUrls;
}

async function pMap(items, fn, concurrency) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// ── Lightweight HTML extraction (no DOM dependency) ─────────────────

function stripTags(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripTags(m[1]).trim() : '';
}

function extractMetaDesc(html) {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*>/i)
    || html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["'][^>]*>/i);
  return m ? m[1].trim() : '';
}

function extractInternalLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const links = new Set();
  const re = /<a\s[^>]*href=["'](.*?)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === base.hostname) links.add(resolved.href);
    } catch { /* skip */ }
  }
  return [...links];
}

// ── Page analysis ───────────────────────────────────────────────────

function analyzePage(url, html) {
  const issues = [];

  const title = extractTitle(html);
  const metaDesc = extractMetaDesc(html);
  if (!title) issues.push({ type: 'missing-title', detail: 'Page has no <title>' });
  if (!metaDesc) issues.push({ type: 'missing-meta-desc', detail: 'Page has no meta description' });

  // Extract visible text and check blacklist
  const visibleText = stripTags(html);
  for (const rule of BLACKLIST_RULES) {
    if (rule.pattern.test(visibleText)) {
      // Find approximate match for context
      const match = visibleText.match(rule.pattern);
      const ctx = match ? visibleText.slice(Math.max(0, match.index - 20), match.index + 60).trim() : '';
      issues.push({ type: 'blacklist', detail: `${rule.label}: "...${ctx}..."` });
    }
  }

  const internalLinks = extractInternalLinks(html, url);

  // Count dashes
  const emDashes = (visibleText.match(/\u2014/g) || []).length;
  const enDashes = (visibleText.match(/\u2013/g) || []).length;

  return { title, metaDesc, issues, internalLinks, emDashes, enDashes };
}

// ── Main ────────────────────────────────────────────────────────────

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error('Usage: node scripts/live-scan.mjs <base-url>');
  process.exit(2);
}

console.error(`Scanning ${baseUrl} ...`);

const urls = await getSitemapUrls(baseUrl);
if (urls.length === 0) {
  console.error('No URLs found in sitemap. Scanning homepage only.');
  urls.push(baseUrl);
}
console.error(`Found ${urls.length} page(s) in sitemap.`);

const pageResults = await pMap(
  urls,
  async (url) => {
    const { status, html } = await fetchPage(url);
    const path = new URL(url).pathname;
    if (status !== 200) {
      return { path, url, status, issues: [{ type: 'http-error', detail: `Status ${status}` }], analysis: null };
    }
    const analysis = analyzePage(url, html);
    return { path, url, status, issues: analysis.issues, analysis };
  },
  CONCURRENCY,
);

// Check internal links (sample — first 50 unique)
const linkMap = new Map();
for (const r of pageResults) {
  if (!r.analysis) continue;
  for (const link of r.analysis.internalLinks) {
    if (!linkMap.has(link)) linkMap.set(link, r.path);
  }
}

const brokenLinks = [];
const linksToCheck = [...linkMap.entries()].slice(0, 50);
await pMap(
  linksToCheck,
  async ([link, from]) => {
    try {
      const res = await fetch(link, { method: 'HEAD', headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (res.status !== 200) brokenLinks.push({ from, link, status: res.status });
    } catch {
      brokenLinks.push({ from, link, status: 'error' });
    }
  },
  CONCURRENCY,
);

// ── Report ──────────────────────────────────────────────────────────

let hasViolation = false;
const out = [];

out.push(`# Live scan report — ${baseUrl}`);
out.push(`Scanned ${pageResults.length} page(s) at ${new Date().toISOString()}\n`);

const issueCount = pageResults.reduce((n, r) => n + r.issues.length, 0) + brokenLinks.length;
out.push('## Summary');
out.push(`- Pages scanned: ${pageResults.length}`);
out.push(`- Issues found: ${issueCount}`);
out.push(`- Broken internal links: ${brokenLinks.length}`);
out.push('');

if (issueCount > 0 || brokenLinks.length > 0) {
  hasViolation = true;
  out.push('## Issues\n');
  for (const r of pageResults) {
    if (r.issues.length === 0) continue;
    out.push(`### ${r.path}`);
    for (const issue of r.issues) out.push(`- **${issue.type}**: ${issue.detail}`);
    out.push('');
  }
  if (brokenLinks.length > 0) {
    out.push('### Broken internal links\n');
    for (const { from, link, status } of brokenLinks) {
      out.push(`- ${from} → ${new URL(link).pathname} (${status})`);
    }
    out.push('');
  }
}

const totalEm = pageResults.reduce((n, r) => n + (r.analysis?.emDashes ?? 0), 0);
const totalEn = pageResults.reduce((n, r) => n + (r.analysis?.enDashes ?? 0), 0);
out.push('## Typography');
out.push(`- Em dashes (\\u2014): ${totalEm}`);
out.push(`- En dashes (\\u2013): ${totalEn}`);
out.push('');

const cleanPages = pageResults.filter((r) => r.issues.length === 0);
out.push(`## Clean pages: ${cleanPages.length}/${pageResults.length}\n`);

console.log(out.join('\n'));
process.exit(hasViolation ? 1 : 0);
