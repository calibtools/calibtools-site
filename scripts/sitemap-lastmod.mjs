#!/usr/bin/env node
/**
 * sitemap-lastmod.mjs — inject <lastmod> into the Astro-generated sitemap.
 * Sources: guide frontmatter `updated`, git commit date for everything else.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');

// Map URL path → source file
function sourceFileForPath(urlPath) {
  const p = urlPath.replace(/\/$/, '') || '/index';

  // Guide pages
  const guideMatch = p.match(/^\/guides\/(.+)$/);
  if (guideMatch) return { file: `src/content/guides/${guideMatch[1]}.md`, type: 'guide' };

  // Product pages (dynamic)
  if (p.match(/^\/targets\/[^/]+$/) && p !== '/targets') {
    return { file: 'src/pages/targets/[handle].astro', type: 'page' };
  }

  // Collection pages
  if (p.match(/^\/targets\/collection\/.+$/)) {
    return { file: 'src/pages/targets/collection/[collection].astro', type: 'page' };
  }

  // Tool sub-pages: /tools/generator/charuco etc.
  const toolSubMatch = p.match(/^\/tools\/generator\/(.+)$/);
  if (toolSubMatch) return { file: `src/pages/tools/generator/${toolSubMatch[1]}.astro`, type: 'page' };

  // Tool pages: /tools/<name>
  const toolMatch = p.match(/^\/tools\/(.+)$/);
  if (toolMatch) return { file: `src/pages/tools/${toolMatch[1]}.astro`, type: 'page' };

  // Index pages
  if (p === '/index' || p === '') return { file: 'src/pages/index.astro', type: 'page' };
  if (p === '/targets') return { file: 'src/pages/targets/index.astro', type: 'page' };
  if (p === '/tools') return { file: 'src/pages/tools/index.astro', type: 'page' };
  if (p === '/guides') return { file: 'src/pages/guides/index.astro', type: 'page' };
  if (p === '/files') return { file: 'src/pages/files/index.astro', type: 'page' };

  // Direct pages
  const name = p.replace(/^\//, '');
  return { file: `src/pages/${name}.astro`, type: 'page' };
}

function getGuideFrontmatterDate(filePath) {
  try {
    const content = readFileSync(resolve(ROOT, filePath), 'utf-8');
    const match = content.match(/^updated:\s*(\d{4}-\d{2}-\d{2})/m);
    if (match) return match[1];
  } catch { /* fallthrough */ }
  return null;
}

function getGitDate(filePath) {
  try {
    const abs = resolve(ROOT, filePath);
    const date = execFileSync('git', ['log', '-1', '--format=%cI', '--', abs], { cwd: ROOT, encoding: 'utf-8' }).trim();
    if (date) return date.slice(0, 10);
  } catch { /* fallthrough */ }
  return null;
}

// Find sitemap XML files
const sitemapFiles = readdirSync(DIST).filter(
  (f) => f.startsWith('sitemap') && f.endsWith('.xml') && f !== 'sitemap-index.xml',
);

let updated = 0;

for (const sitemapFile of sitemapFiles) {
  const fullPath = join(DIST, sitemapFile);
  let xml = readFileSync(fullPath, 'utf-8');

  xml = xml.replace(/<url>\s*<loc>([^<]+)<\/loc>(?!\s*<lastmod)/g, (match, loc) => {
    const url = new URL(loc);
    const source = sourceFileForPath(url.pathname);
    let date = null;

    if (source.type === 'guide') {
      date = getGuideFrontmatterDate(source.file) || getGitDate(source.file);
    } else {
      date = getGitDate(source.file);
    }

    if (date) {
      updated++;
      return match.replace('</loc>', `</loc>\n    <lastmod>${date}</lastmod>`);
    }
    return match;
  });

  writeFileSync(fullPath, xml);
}

console.log(`[sitemap-lastmod] Injected <lastmod> into ${updated} URL(s).`);
