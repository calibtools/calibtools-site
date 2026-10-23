/**
 * Post-build link checker: crawls dist/ for internal <a href> targets
 * and exits 1 if any points to a path that does not exist in dist/.
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

    if (!exists) {
      const relFile = file.replace(DIST + '/', '');
      broken.push({ file: relFile, href });
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

console.log(`[check-links] OK — ${htmlFiles.length} HTML files, all internal links resolve.`);
