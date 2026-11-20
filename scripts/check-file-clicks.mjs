#!/usr/bin/env node
/**
 * Clicks file links in a real browser and checks that the page the visitor is reading stays put:
 * same address, same scroll position, and the file arrives in a new tab (or as a download).
 * Files are served as a small stand-in page, so the result does not depend on a PDF viewer.
 * Every file link on /files/ and the first file link on every other page that has one.
 *
 * Usage (build first):  node scripts/check-file-clicks.mjs [--engines chromium,firefox,webkit]
 * Exit code 1 when a click replaces the page. Chromium: Playwright's own, or CT_CHROMIUM_PATH.
 */
import { chromium, firefox, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { isFileLink } from './file-links.mjs';

const argv = process.argv.slice(2);
const opt = (f) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : null; };
const ENGINES = (opt('--engines') ?? 'chromium').split(',');
const DIST = 'dist';
const ALL_LINKS_ON = new Set(['/files/']);
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.pdf': 'application/pdf', '.zip': 'application/zip' };

function pages(dir, base = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...pages(p, `${base}/${name}`));
    else if (name === 'index.html') out.push(`${base}/`);
  }
  return out;
}

/** Pages that carry at least one file link, from the built HTML. */
const targets = pages(DIST).filter((path) => {
  const html = readFileSync(join(DIST, path, 'index.html'), 'utf-8');
  return [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].some((m) => isFileLink(m[1]));
});

const server = createServer((req, res) => {
  // Headless browsers have no PDF viewer and would save the file whatever the link says. A small page in its
  // place makes the link behave as it does for a visitor: same tab unless the link opens a new one.
  if (isFileLink(req.url)) { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>file</title>'); return; }
  let p = join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const launchers = { chromium, firefox, webkit };
const findings = [];
let clicks = 0;

for (const engine of ENGINES) {
  const browser = await launchers[engine].launch(engine === 'chromium' ? { executablePath: process.env.CT_CHROMIUM_PATH || undefined, args: ['--no-sandbox'] } : {});
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  // keep third-party tags out of the check
  await context.route((url) => !url.href.startsWith(base), (route) => route.abort());
  for (const path of targets) {
    const page = await context.newPage();
    await page.goto(base + path, { waitUntil: 'load' });
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    const fileIdx = hrefs.map((h, i) => (isFileLink(h) ? i : -1)).filter((i) => i !== -1);
    // collapsed sections hold links too
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    let done = 0;
    for (const i of fileIdx) {
      if (done > 0 && !ALL_LINKS_ON.has(path)) break;
      const link = page.locator('a[href]').nth(i);
      // thumbnails that repeat a text link are hidden from assistive technology and skipped here too
      if (!(await link.isVisible()) || (await link.getAttribute('aria-hidden')) === 'true') continue;
      await link.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const before = { url: page.url(), y: await page.evaluate(() => window.scrollY) };
      const opened = Promise.race([
        context.waitForEvent('page', { timeout: 5000 }).then(async (p) => { await p.close().catch(() => {}); return 'new tab'; }),
        page.waitForEvent('download', { timeout: 5000 }).then(() => 'download'),
      ]).catch(() => 'nothing');
      await link.click({ timeout: 10000 });
      const how = await opened;
      clicks += 1;
      done += 1;
      const after = { url: page.url(), y: await page.evaluate(() => window.scrollY).catch(() => -1) };
      if (how === 'nothing' || after.url !== before.url || Math.abs(after.y - before.y) > 1) {
        findings.push(`${engine} ${path} → ${hrefs[i]}: ${how}; page ${after.url === before.url ? 'kept its address' : `went to ${after.url}`}, scroll ${before.y} → ${after.y}`);
        if (after.url !== before.url) await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      }
    }
    if (done === 0) findings.push(`${engine} ${path}: has file links but none could be clicked`);
    await page.close();
  }
  await browser.close();
}
server.close();

if (findings.length) {
  console.error(`\n  ${findings.length} file link(s) disturb the page:\n`);
  for (const f of findings) console.error(`    ${f}`);
  process.exit(1);
}
console.log(`[check-file-clicks] OK — ${clicks} clicks on ${targets.length} pages in ${ENGINES.join(', ')}: the page stayed; the file opened in a new tab or as a download.`);
