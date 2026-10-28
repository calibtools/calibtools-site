#!/usr/bin/env node
/**
 * check-nav.mjs — Post-build BFS navigation audit (zero dependencies).
 *
 * Asserts:
 *   1. Max click depth <= 2 for every page in the inventory
 *   2. Zero orphan pages (every page reachable from /)
 *   3. Every nav href resolves to a file in dist (aria-disabled links exempt)
 *   4. No page appears in more than two footer/header nav groups
 *
 * Usage: node scripts/check-nav.mjs
 * Exit code 0 = pass, 1 = failures found.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST = resolve('dist');
const MAX_DEPTH = 2;

// Pages that are not navigation targets
const EXCLUDED = new Set([
  '/404/',
  '/review/',          // internal review submission flow (noindex)
  '/verify/unknown/',  // fallback for invalid serial numbers (noindex)
]);

// Duplicate-named pages (e.g. "index 2.html") are build artifacts, skip
const SKIP_FILE_PATTERN = /index \d/;

// ── Collect all pages ────────────────────────────────────────────────

function findPages(dir, base = '') {
  const pages = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_FILE_PATTERN.test(entry)) continue;
    const full = join(dir, entry);
    const rel = base + '/' + entry;
    if (statSync(full).isDirectory()) {
      pages.push(...findPages(full, rel));
    } else if (entry === 'index.html') {
      const pagePath = base === '' ? '/' : base + '/';
      pages.push(pagePath);
    }
  }
  return pages;
}

const allPages = findPages(DIST).filter((p) => !EXCLUDED.has(p));

// ── Extract internal links from HTML ─────────────────────────────────

function extractLinks(htmlPath) {
  if (!existsSync(htmlPath)) return [];
  const html = readFileSync(htmlPath, 'utf-8');
  const links = new Set();
  // Match href="/..." (internal absolute paths, strip query strings)
  const re = /href="(\/[^"#?]*?)(?:[?#][^"]*)?"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    if (!href.endsWith('/')) href += '/';
    links.add(href);
  }
  return [...links];
}

// ── BFS ──────────────────────────────────────────────────────────────

function bfs() {
  const depth = new Map();
  depth.set('/', 0);
  const queue = [{ path: '/', d: 0 }];

  while (queue.length > 0) {
    const { path, d } = queue.shift();
    // Try to find the HTML file
    let htmlFile;
    if (path === '/') {
      htmlFile = join(DIST, 'index.html');
    } else {
      htmlFile = join(DIST, path, 'index.html');
    }

    const links = extractLinks(htmlFile);
    for (const link of links) {
      if (!depth.has(link)) {
        depth.set(link, d + 1);
        queue.push({ path: link, d: d + 1 });
      }
    }
  }
  return depth;
}

// ── Check nav hrefs ──────────────────────────────────────────────────

function checkNavHrefs() {
  const htmlFile = join(DIST, 'index.html');
  if (!existsSync(htmlFile)) return [];
  const html = readFileSync(htmlFile, 'utf-8');

  // Extract the <nav> section
  const navStart = html.indexOf('<nav');
  const navEnd = html.indexOf('</nav>');
  if (navStart < 0 || navEnd < 0) return [];
  const navHtml = html.slice(navStart, navEnd);

  const broken = [];
  const re = /href="(\/[^"#]*?)"/g;
  let m;
  while ((m = re.exec(navHtml)) !== null) {
    let href = m[1];
    if (!href.endsWith('/')) href += '/';
    const target = join(DIST, href, 'index.html');
    if (!existsSync(target)) {
      // Check if the link is aria-disabled (coming soon)
      const nearby = navHtml.slice(Math.max(0, m.index - 200), m.index + m[0].length + 50);
      if (!nearby.includes('aria-disabled="true"')) {
        broken.push(href);
      }
    }
  }
  return [...new Set(broken)];
}

// ── Run ──────────────────────────────────────────────────────────────

const errors = [];

// BFS depth + orphan check
const depths = bfs();
for (const page of allPages) {
  const d = depths.get(page);
  if (d === undefined) {
    // Check if it's a child of an excluded page
    const isExcludedChild = [...EXCLUDED].some((ex) => page.startsWith(ex) && page !== ex);
    if (!isExcludedChild) {
      errors.push(`orphan: ${page} not reachable from /`);
    }
  } else if (d > MAX_DEPTH) {
    errors.push(`depth ${d} > ${MAX_DEPTH}: ${page}`);
  }
}

// Nav hrefs
const broken = checkNavHrefs();
for (const href of broken) {
  errors.push(`broken nav href: ${href}`);
}

// Nav-group membership: no page in more than two groups
const MAX_GROUPS = 2;
{
  const htmlFile = join(DIST, 'index.html');
  if (existsSync(htmlFile)) {
    const html = readFileSync(htmlFile, 'utf-8');
    // Extract nav and footer sections
    const navStart = html.indexOf('<nav');
    const navEnd = html.indexOf('</nav>');
    const footerStart = html.indexOf('<footer');
    const footerEnd = html.indexOf('</footer>');

    // Collect hrefs per "group" — each [data-nav-panel] (desktop only) and each footer column
    const groupHrefs = [];
    const navHtml = navStart >= 0 && navEnd >= 0 ? html.slice(navStart, navEnd) : '';
    // Exclude mobile drawer from panel counting
    const drawerIdx = navHtml.indexOf('data-mobile-drawer');
    const desktopNavHtml = drawerIdx >= 0 ? navHtml.slice(0, drawerIdx) : navHtml;
    // Find each data-nav-panel block — track nesting depth from the opening div
    const panelStarts = [...desktopNavHtml.matchAll(/data-nav-panel/g)];
    for (const ps of panelStarts) {
      // Find the opening < of this div
      let divStart = desktopNavHtml.lastIndexOf('<', ps.index);
      // Walk forward to find the matching closing </div> by counting depth
      let depth = 0;
      let pos = divStart;
      let panelEnd = desktopNavHtml.length;
      const tagRe = /<\/?div[\s>]/g;
      tagRe.lastIndex = pos;
      let tm;
      while ((tm = tagRe.exec(desktopNavHtml)) !== null) {
        if (tm[0].startsWith('</')) {
          depth--;
          if (depth === 0) { panelEnd = tm.index + tm[0].length; break; }
        } else {
          depth++;
        }
      }
      const chunk = desktopNavHtml.slice(divStart, panelEnd);
      const hrefRe = /href="(\/[^"#]*?)"/g;
      const group = new Set();
      let hm;
      while ((hm = hrefRe.exec(chunk)) !== null) {
        let h = hm[1];
        if (!h.endsWith('/')) h += '/';
        group.add(h);
      }
      if (group.size > 0) groupHrefs.push(group);
    }
    // Footer columns
    const footerHtml = footerStart >= 0 && footerEnd >= 0 ? html.slice(footerStart, footerEnd) : '';
    // Split by group heading pattern (font-mono uppercase)
    const footerSections = footerHtml.split(/font-mono[^>]*uppercase/);
    for (const sec of footerSections.slice(1)) {
      const hrefRe = /href="(\/[^"#]*?)"/g;
      const group = new Set();
      let hm;
      while ((hm = hrefRe.exec(sec)) !== null) {
        let h = hm[1];
        if (!h.endsWith('/')) h += '/';
        group.add(h);
      }
      if (group.size > 0) groupHrefs.push(group);
    }

    // Count how many groups each href appears in
    const membership = new Map();
    for (const group of groupHrefs) {
      for (const href of group) {
        membership.set(href, (membership.get(href) || 0) + 1);
      }
    }
    for (const [href, count] of membership) {
      if (count > MAX_GROUPS) {
        errors.push(`${href} appears in ${count} nav groups (max ${MAX_GROUPS})`);
      }
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error(`[check-nav] ${errors.length} error(s) found:\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
} else {
  // Max depth among actual HTML pages only
  const pageDepths = allPages.map((p) => depths.get(p) ?? 0);
  const maxDepth = Math.max(...pageDepths);
  console.log(`[check-nav] OK — ${allPages.length} pages checked, max depth ${maxDepth}, no errors.`);
}
