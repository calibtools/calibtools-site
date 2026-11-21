#!/usr/bin/env node
/**
 * sitemap-lastmod.mjs — inject <lastmod> into the Astro-generated sitemap.
 * Sources: guide frontmatter `updated`, git commit date for everything else.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');

// Map URL path → the source files behind it (template, then content). The newest commit date wins.
export function sourceFilesForPath(urlPath) {
  const p = urlPath.replace(/\/$/, '') || '/index';
  let m;
  if ((m = p.match(/^\/calibacademy\/(.+)$/))) return [`src/content/guides/${m[1]}.md`];
  if (p === '/applications') return ['src/pages/applications/index.astro'];
  if ((m = p.match(/^\/applications\/([^/]+)$/))) return ['src/pages/applications/[slug].astro', `src/content/applications/${m[1]}.md`];
  if ((m = p.match(/^\/targets\/collection\/(.+)$/))) return ['src/pages/targets/collection/[collection].astro', `src/content/collections/${m[1]}.md`];
  if ((m = p.match(/^\/targets\/([^/]+)$/))) return ['src/pages/targets/[handle].astro', `src/content/products/${m[1]}.md`];
  if ((m = p.match(/^\/tools\/generator\/([^/]+)$/))) return [`src/pages/tools/generator/${m[1]}.astro`, `src/content/tools/generator-${m[1]}.md`];
  if ((m = p.match(/^\/tools\/([^/]+)$/))) return [`src/pages/tools/${m[1]}.astro`, `src/content/tools/${m[1]}.md`];
  if (p === '/index') return ['src/pages/index.astro'];
  if (['/targets', '/tools', '/calibacademy', '/files'].includes(p)) return [`src/pages${p}/index.astro`];
  return [`src/pages${p}.astro`];
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // Find sitemap XML files
  const sitemapFiles = readdirSync(DIST).filter(
    (f) => f.startsWith('sitemap') && f.endsWith('.xml') && f !== 'sitemap-index.xml',
  );

  let updated = 0;

  for (const sitemapFile of sitemapFiles) {
    const fullPath = join(DIST, sitemapFile);
    let xml = readFileSync(fullPath, 'utf-8');

    xml = xml.replace(/<url>\s*<loc>([^<]+)<\/loc>(?!\s*<lastmod)/g, (match, loc) => {
      const files = sourceFilesForPath(new URL(loc).pathname).filter((f) => existsSync(resolve(ROOT, f)));
      const dates = files.map((f) => (f.startsWith('src/content/guides/') && getGuideFrontmatterDate(f)) || getGitDate(f)).filter(Boolean);
      const date = dates.sort().at(-1) ?? null;

      if (date) {
        updated++;
        return match.replace('</loc>', `</loc>\n    <lastmod>${date}</lastmod>`);
      }
      return match;
    });

    writeFileSync(fullPath, xml);
  }

  console.log(`[sitemap-lastmod] Injected <lastmod> into ${updated} URL(s).`);
}
