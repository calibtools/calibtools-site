#!/usr/bin/env node
/**
 * Card-row check (DESIGN.md §3 "Card rows"): cards that sit side by side must keep the same line of
 * content at the same height. Opens every built page at desktop and tablet width, finds grids whose
 * children are alike (same tag and classes), and compares, card against card in one visual row:
 *   - the top of each content slot (label, title, copy …), slot by slot;
 *   - the bottom of the last slot, when it is a price or an action line;
 *   - the card heights.
 * A difference above 1 px is reported. Exit code 1 when anything is reported.
 *
 * Usage: build first, then `node scripts/check-card-rows.mjs [dist] [/only/this/path/ …]`
 * Needs Chromium: Playwright's own, or CT_CHROMIUM_PATH.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = process.argv[2] && !process.argv[2].startsWith('/') ? process.argv[2] : 'dist';
const ONLY = process.argv.slice(2).filter((a) => a.startsWith('/'));
const WIDTHS = [1280, 900, 768];
const TOLERANCE = 1;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };

function pages(dir, base = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...pages(p, `${base}/${name}`));
    else if (name === 'index.html') out.push(`${base}/`);
  }
  return out;
}

const server = createServer((req, res) => {
  let p = join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

/** Runs in the page. Returns one finding per misaligned row. */
function measure(tolerance) {
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  /** Content slots of a card: its element children, looking through display:contents wrappers. */
  const slots = (card) => {
    const out = [];
    const walk = (el) => {
      for (const c of el.children) {
        const cs = getComputedStyle(c);
        if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
        if (cs.display === 'contents') walk(c);
        else if (c.getBoundingClientRect().width > 0) out.push(c); /* an empty slot still holds its row */
      }
    };
    walk(card);
    return out;
  };
  const findings = [];
  for (const grid of document.querySelectorAll('*')) {
    const cs = getComputedStyle(grid);
    if (cs.display !== 'grid' && cs.display !== 'flex') continue;
    if (cs.display === 'flex' && cs.flexDirection.startsWith('column')) continue;
    const kids = [...grid.children].filter(visible);
    if (kids.length < 2) continue;
    /* Alike children only: a two-column page layout (text | figure) is not a card row */
    const sig = (el) => `${el.tagName}.${el.className}`;
    if (!kids.every((k) => sig(k) === sig(kids[0]))) continue;
    /* A card has at least two slots; chips, nav links and table cells do not */
    if (!kids.every((k) => slots(k).length >= 2)) continue;
    const rows = new Map();
    for (const k of kids) {
      const top = Math.round(k.getBoundingClientRect().top);
      const key = [...rows.keys()].find((t) => Math.abs(t - top) <= 2) ?? top;
      rows.set(key, [...(rows.get(key) ?? []), k]);
    }
    for (const row of rows.values()) {
      if (row.length < 2) continue;
      const problems = [];
      const rects = row.map((k) => k.getBoundingClientRect());
      const spread = (xs) => Math.max(...xs) - Math.min(...xs);
      if (spread(rects.map((r) => r.height)) > tolerance) problems.push(`card heights differ by ${Math.round(spread(rects.map((r) => r.height)))} px`);
      const all = row.map(slots);
      const n = Math.min(...all.map((s) => s.length));
      for (let i = 0; i < n; i++) {
        const tops = all.map((s, j) => s[i].getBoundingClientRect().top - rects[j].top);
        if (spread(tops) > tolerance) problems.push(`slot ${i + 1} (${all[0][i].textContent.trim().slice(0, 24) || all[0][i].tagName.toLowerCase()}) starts ${Math.round(spread(tops))} px apart`);
      }
      /* The last slot is held to the bottom edge only when it is a price or an action (short text);
         a paragraph or a list that ends the card may end where its text ends. */
      const last = all.map((s) => s[s.length - 1]);
      const short = last.every((el) => { const t = el.textContent.trim(); return t.length > 0 && t.length <= 40 && !el.querySelector('li, p'); });
      const ends = last.map((el, j) => rects[j].bottom - el.getBoundingClientRect().bottom);
      if (short && spread(ends) > tolerance) problems.push(`last slot ends ${Math.round(spread(ends))} px apart`);
      if (problems.length) findings.push({ grid: `${grid.tagName.toLowerCase()}.${String(grid.className).split(/\s+/).slice(0, 4).join('.')}`, first: row[0].textContent.trim().replace(/\s+/g, ' ').slice(0, 40), cards: row.length, problems });
    }
  }
  return findings;
}

const browser = await chromium.launch({ executablePath: process.env.CT_CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
let total = 0;
const list = ONLY.length ? ONLY : pages(DIST).sort();
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  for (const path of list) {
    await page.goto(base + path, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    for (const f of await page.evaluate(measure, TOLERANCE)) {
      total++;
      console.log(`${width}px ${path}  ${f.grid}  [${f.cards} cards, first: "${f.first}"]\n    ${f.problems.join('; ')}`);
    }
  }
  await ctx.close();
}
await browser.close();
server.close();
console.log(total ? `${total} misaligned card row(s)` : `card rows: ${list.length} pages × ${WIDTHS.length} widths, all aligned`);
process.exit(total ? 1 : 0);
