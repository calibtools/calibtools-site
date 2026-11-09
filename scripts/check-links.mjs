/**
 * Post-build link checker: crawls dist/ for internal <a href> targets
 * and exits 1 if any points to a path that does not exist in dist/.
 *
 * Also exits 1 if a live page links to a page marked noindex (draft guides etc.):
 * Google follows the link and reports "Excluded by 'noindex' tag". Utility pages
 * that are noindex on purpose but meant to be reached (quote, cart …) are allowed.
 *
 * Ignores: external URLs, mailto:, tel:, anchor-only (#), javascript:.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DIST = resolve('dist');

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

const htmlFiles = findHtmlFiles(DIST);
const hrefRegex = /<a\s[^>]*?href="([^"]*?)"/gi;
const broken = [];
const toNoindex = [];
/** noindex on purpose and fine to link to. */
const NOINDEX_LINK_OK = ['/quote/', '/cart/', '/review/', '/verify/'];
const NOINDEX_RE = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i;
const isNoindex = (path) => NOINDEX_RE.test(readFileSync(path, 'utf-8'));

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf-8');
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];

    // Skip external, mailto, tel, anchor-only, javascript
    if (!href || href.startsWith('http://') || href.startsWith('https://') ||
        href.startsWith('mailto:') || href.startsWith('tel:') ||
        href.startsWith('#') || href.startsWith('javascript:')) {
      continue;
    }

    // Strip query string and hash
    const clean = href.split('?')[0].split('#')[0];
    if (!clean) continue;

    // Resolve against dist/
    const target = resolve(DIST, clean.startsWith('/') ? clean.slice(1) : clean);

    // Check: exact file in dist/, directory with index.html, or static file in public/
    const publicTarget = resolve('public', clean.startsWith('/') ? clean.slice(1) : clean);
    const exists = existsSync(target) ||
      existsSync(join(target, 'index.html')) ||
      existsSync(publicTarget);

    const relFile = file.replace(DIST + '/', '');
    if (!exists) {
      broken.push({ file: relFile, href });
    } else if (!isNoindex(file) && !NOINDEX_LINK_OK.some((p) => clean.startsWith(p))) {
      const page = existsSync(join(target, 'index.html')) ? join(target, 'index.html') : (target.endsWith('.html') && existsSync(target) ? target : '');
      if (page && isNoindex(page)) toNoindex.push({ file: relFile, href });
    }
  }
}

if (broken.length > 0) {
  console.error(`\n  ${broken.length} broken internal link(s) found:\n`);
  for (const { file, href } of broken) {
    console.error(`    ${file} → ${href}`);
  }
  console.error('');
  process.exit(1);
}

if (toNoindex.length > 0) {
  console.error(`\n  ${toNoindex.length} link(s) from live pages to noindex pages:\n`);
  for (const { file, href } of toNoindex) console.error(`    ${file} → ${href}`);
  console.error('');
  process.exit(1);
}

console.log(`[check-links] OK — ${htmlFiles.length} HTML files, all internal links resolve.`);
