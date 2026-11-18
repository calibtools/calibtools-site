#!/usr/bin/env node
/**
 * llms-txt.mjs — postbuild: write dist/llms.txt (https://llmstxt.org/) from what the build publishes.
 * Every URL in the sitemap, with the title and meta description of its built page, grouped by section.
 * Built from dist so it never lists a page that is not live.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE_SUFFIX = / · Calib\.Tools$/;
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export function pageInfo(html) {
  const title = decode((/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? '').replace(SITE_SUFFIX, '').trim();
  const description = decode((/<meta\s+name="description"\s+content="([^"]*)"/.exec(html) ?? [])[1] ?? '').trim();
  return { title, description };
}

const SECTIONS = [
  ['Free tools', (p) => p.startsWith('/tools/')],
  ['Guides', (p) => p.startsWith('/guides/')],
  ['Calibration targets', (p) => p.startsWith('/targets/')],
  ['Applications', (p) => p.startsWith('/applications/')],
  ['Downloads', (p) => p.startsWith('/files/')],
  ['Company', () => true],
];

export function buildLlmsTxt(pages) {
  const home = pages.find((p) => new URL(p.url).pathname === '/');
  const out = ['# Calib.Tools', '', `> ${home?.description ?? 'Calibration targets and free tools for machine vision.'}`, '',
    'Calib.Tools makes camera calibration targets (ChArUco, checkerboard, AprilGrid, circle grid, LiDAR, thermal) and runs free browser tools that generate print-exact patterns for OpenCV, Kalibr, ROS and HALCON. The tools run in the browser; nothing is uploaded.', ''];
  const rest = pages.filter((p) => p !== home);
  const used = new Set();
  for (const [name, match] of SECTIONS) {
    const items = rest.filter((p) => !used.has(p) && match(new URL(p.url).pathname));
    if (!items.length) continue;
    items.forEach((p) => used.add(p));
    out.push(`## ${name}`, '', ...items.map((p) => `- [${p.title}](${p.url})${p.description ? `: ${p.description}` : ''}`), '');
  }
  return out.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const DIST = resolve(import.meta.dirname, '..', 'dist');
  const urls = readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f))
    .flatMap((f) => [...readFileSync(join(DIST, f), 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const pages = urls.map((url) => {
    const file = join(DIST, new URL(url).pathname, 'index.html');
    return existsSync(file) ? { url, ...pageInfo(readFileSync(file, 'utf-8')) } : null;
  }).filter((p) => p && p.title);
  writeFileSync(join(DIST, 'llms.txt'), buildLlmsTxt(pages));
  console.log(`[llms-txt] Wrote dist/llms.txt with ${pages.length} pages.`);
}
