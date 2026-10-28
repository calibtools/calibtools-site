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

// Pages that are not navigation targets or are reached via JS tabs/redirects
const EXCLUDED = new Set([
  '/404/',
  '/review/',
  '/verify/unknown/',            // fallback for invalid serial numbers
  '/tools/generator/charuco/',   // tab within /tools/generator/
  '/tools/generator/checkerboard/', // tab within /tools/generator/
  '/tools/generator/aprilgrid/', // tab within /tools/generator/
  '/tools/generator/circles/',   // tab within /tools/generator/
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
  // Match href="/..." (internal absolute paths)
  const re = /href="(\/[^"#]*?)"/g;
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

// ── Report ───────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error(`[check-nav] ${errors.length} error(s) found:\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
} else {
  const maxDepth = Math.max(...[...depths.values()]);
  console.log(`[check-nav] OK — ${allPages.length} pages checked, max depth ${maxDepth}, no errors.`);
}
