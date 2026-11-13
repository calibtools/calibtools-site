#!/usr/bin/env node
/**
 * Side-by-side check (DESIGN.md §3 "Card rows"): blocks that sit side by side must keep the same line
 * of content at the same height, whatever the content is.
 *
 * Opens every built page, finds rows of alike blocks (same tag, same or mostly shared classes, two or
 * more content lines) and compares, block against block in one visual row, where each line starts.
 * Lines are the block's parts top to bottom, including its own text and the parts of plain stacking
 * wrappers; blocks in one row must have the same number of lines.
 * A price or action line that ends the block is also held to the bottom edge.
 *
 * Three passes per page:
 *   as built    the copy the site ships today;
 *   stress      one block at a time gets a slot made long (the longest title and description in the
 *               store, or three times its own text) and then empty; the slots below must stay level
 *               with the neighbors. This is what fails a `flex-col` card that only happens to line up
 *               with today's copy;
 *   no fonts    web fonts blocked, so the fallback font sets the line breaks (one width).
 *
 * Widths: the narrowest width of every layout band (Tailwind breakpoints 640, 768, 1024, 1280), a
 * phone (390) and a wide desktop (1920). 640 is also what a 1280 window shows at 200 % zoom.
 * The site carries no analytics, so there is no viewport histogram to pick from; Search Console shows
 * 84 % desktop, 16 % phone, tablets near zero (28 days to 2026-11-12).
 *
 * Usage (build first):
 *   node scripts/check-card-rows.mjs [--engines chromium,firefox,webkit] [--widths 1280,768]
 *                                    [--no-stress] [--json out.json] [/only/this/path/ …]
 * Exit code 1 when anything is reported. Chromium: Playwright's own, or CT_CHROMIUM_PATH.
 */
import { chromium, firefox, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const argv = process.argv.slice(2);
const opt = (f) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : null; };
const DIST = 'dist';
const ONLY = argv.filter((a, i) => a.startsWith('/') && !(argv[i - 1] ?? '').startsWith('--'));
const ENGINES = (opt('--engines') ?? 'chromium').split(',');
const WIDTHS = (opt('--widths') ?? '1920,1280,1024,768,640,390').split(',').map(Number);
const STRESS = !argv.includes('--no-stress');
const JSON_OUT = opt('--json');
const TOLERANCE = 1;
/* Longest product title and description in the store on 2026-11-13 */
const LONG = {
  title: 'Checkerboard Calibration Target, Aluminum Composite',
  copy: 'HALCON calibration plate on rigid aluminum composite, in the layout that gen_caltab describes: equal black marks in a regular grid, inside a black frame with a triangular corner mark. The number of marks and their spacing are agreed with you before the plate is made; a .descr file in the same format comes with the plate.',
};
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };

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

/**
 * Runs in the page. Returns { rows, findings }: rows = how many side-by-side rows were measured,
 * findings = one entry per misaligned row.
 */
function measure({ tolerance, stress, long }) {
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const classes = (el) => String(el.className?.baseVal ?? el.className ?? '').split(/\s+/).filter(Boolean);
  /** Alike: same tag, and the same classes or at least 40 % of them shared (a cell with an extra border is still a cell). */
  const alike = (a, b) => {
    if (a.tagName !== b.tagName) return false;
    const ca = new Set(classes(a)); const cb = new Set(classes(b));
    if (!ca.size && !cb.size) return true;
    const shared = [...ca].filter((c) => cb.has(c)).length;
    return shared / new Set([...ca, ...cb]).size >= 0.4;
  };
  const WRAPPERS = new Set(['DIV', 'DD', 'SPAN', 'SECTION', 'HEADER']);
  /**
   * Content slots of a block, top to bottom: its element children and its own text, looking through
   * display:contents and through plain stacking wrappers (a wrapper that only holds two or more unlike
   * parts, one under the other). A wrapper whose children are alike is a list and stays one slot.
   */
  const slots = (card) => {
    const out = [];
    const walk = (el) => {
      for (const node of el.childNodes) {
        if (node.nodeType === 3) {
          if (!node.data.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          out.push({ rect: () => range.getBoundingClientRect(), text: () => node.data.trim(), swap: (v) => { const old = node.data; node.data = v || '​'; return () => { node.data = old; }; }, isText: true, tag: '#text' });
          continue;
        }
        if (node.nodeType !== 1) continue;
        const c = node;
        const cs = getComputedStyle(c);
        if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
        if (cs.display === 'contents') { walk(c); continue; }
        const kids = [...c.children].filter((k) => { const ks = getComputedStyle(k); return ks.display !== 'none' && ks.position !== 'absolute'; });
        const ownText = [...c.childNodes].some((n) => n.nodeType === 3 && n.data.trim());
        const stacked = cs.display === 'block' || (cs.display === 'flex' && cs.flexDirection.startsWith('column')) || (cs.display === 'grid' && cs.gridTemplateColumns.split(' ').length === 1);
        const list = kids.length >= 3 && kids.every((k) => alike(k, kids[0]));
        if (WRAPPERS.has(c.tagName) && !ownText && kids.length >= 2 && stacked && !list && kids.every((k) => getComputedStyle(k).display !== 'inline')) { walk(c); continue; }
        if (c.getBoundingClientRect().width > 0) { /* an empty slot still holds its row */
          out.push({ rect: () => c.getBoundingClientRect(), text: () => c.textContent.trim(), swap: (v) => { const old = c.innerHTML; c.textContent = v; return () => { c.innerHTML = old; }; },
            isText: c.textContent.trim().length > 0 && !c.querySelector('img, picture, svg, canvas, video, input, select, textarea, button, table, ul, ol, dl, iframe'), tag: c.tagName.toLowerCase(), el: c });
        }
      }
    };
    walk(card);
    return out;
  };
  const spread = (xs) => Math.max(...xs) - Math.min(...xs);
  const label = (slot) => slot.text().replace(/\s+/g, ' ').slice(0, 24) || slot.tag;

  /** Where each slot starts, block against block. */
  const compare = (row, from = 0) => {
    const rects = row.map((k) => k.getBoundingClientRect());
    const all = row.map(slots);
    const n = Math.min(...all.map((s) => s.length));
    const out = [];
    for (let i = from; i < n; i++) {
      const tops = all.map((s, j) => s[i].rect().top - rects[j].top);
      if (spread(tops) > tolerance) out.push({ slot: i + 1, what: label(all[0][i]), apart: Math.round(spread(tops)), tops: tops.map((t) => Math.round(t)) });
    }
    return { out, all, rects };
  };

  const findings = [];
  let rows = 0;
  for (const grid of document.querySelectorAll('*')) {
    const cs = getComputedStyle(grid);
    if (cs.display !== 'grid' && cs.display !== 'flex' && cs.display !== 'inline-flex') continue;
    if (cs.display !== 'grid' && cs.flexDirection.startsWith('column')) continue;
    if (grid.dataset.rows === 'layout') continue; /* declared page columns, see DESIGN.md §3 */
    const kids = [...grid.children].filter(visible);
    if (kids.length < 2) continue;
    /* Alike children only: a two-column page layout (text | figure) is not a row of blocks */
    if (!kids.every((k) => alike(k, kids[0]))) continue;
    /* A block has at least two slots; chips, nav links and table cells do not */
    if (!kids.some((k) => slots(k).length >= 2)) continue;
    const byTop = new Map();
    for (const k of kids) {
      const top = Math.round(k.getBoundingClientRect().top);
      const key = [...byTop.keys()].find((t) => Math.abs(t - top) <= 2) ?? top;
      byTop.set(key, [...(byTop.get(key) ?? []), k]);
    }
    for (const row of byTop.values()) {
      if (row.length < 2) continue;
      rows++;
      const problems = [];
      const { out, all, rects } = compare(row);
      const counts = all.map((s) => s.length);
      /* Two page columns with different content (a figure beside a long text) are a layout, not a row of blocks */
      if (Math.max(...counts) > 8 || spread(counts) > 2) { rows--; continue; }
      if (spread(counts) > 0) problems.push(`blocks have ${counts.join('/')} lines: a line one block lacks must stay in the markup, empty`);
      for (const o of out) problems.push(`line ${o.slot} (${o.what}) starts ${o.apart} px apart [${o.tops.join(', ')}]`);
      if (spread(rects.map((r) => r.height)) > tolerance) problems.push(`block heights differ by ${Math.round(spread(rects.map((r) => r.height)))} px`);
      /* The last line is held to the bottom edge only when it is a price or an action (short text);
         a paragraph or a list that ends the block may end where its text ends. */
      const last = all.map((s) => s[s.length - 1]).filter(Boolean);
      const short = last.length === row.length && last.every((sl) => { const t = sl.text(); return t.length > 0 && t.length <= 40 && !(sl.el && sl.el.querySelector('li, p')); });
      const ends = last.map((sl, j) => rects[j].bottom - sl.rect().bottom);
      /* …and only when it is the same height in every block: a line that wraps in one block ends where its text ends */
      const sameHeight = spread(last.map((sl) => sl.rect().height)) <= tolerance;
      if (short && sameHeight && spread(ends) > tolerance) problems.push(`last line ends ${Math.round(spread(ends))} px apart`);

      if (stress && !problems.length) {
        const n = Math.min(...counts);
        for (let i = 0; i < n - 1 && !problems.length; i++) {
          const target = slots(row[0])[i];
          if (!target.isText) continue;
          const text = target.text();
          const longer = text.length < 60 ? `${long.title} ${text}` : `${text} ${long.copy}`;
          for (const [name, value] of [['long', longer], ['empty', '']]) {
            const restore = slots(row[0])[i].swap(value);
            const after = compare(row, i + 1).out;
            restore();
            if (after.length) { problems.push(`with line ${i + 1} (${text.slice(0, 24)}) ${name} in one block: line ${after[0].slot} (${after[0].what}) starts ${after[0].apart} px apart`); break; }
          }
        }
      }
      if (problems.length) findings.push({ grid: `${grid.tagName.toLowerCase()}.${classes(grid).slice(0, 4).join('.')}`, first: row[0].textContent.trim().replace(/\s+/g, ' ').slice(0, 40), blocks: row.length, problems });
    }
  }
  return { rows, findings };
}

const launchers = { chromium, firefox, webkit };
const list = ONLY.length ? ONLY : pages(DIST).sort();
const report = [];
let total = 0;
for (const engine of ENGINES) {
  const browser = await launchers[engine].launch(engine === 'chromium' ? { executablePath: process.env.CT_CHROMIUM_PATH || undefined, args: ['--no-sandbox'] } : {});
  /* Last pass: web fonts blocked at the widest band where blocks stand side by side */
  const passes = [...WIDTHS.map((width) => ({ width, fonts: true })), { width: 1280, fonts: false }];
  let rows = 0;
  let found = 0;
  for (const { width, fonts } of passes) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    if (!fonts) await ctx.route(/\.(woff2?|ttf|otf)(\?|$)/, (r) => r.abort());
    const page = await ctx.newPage();
    for (const path of list) {
      await page.goto(base + path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready.then(() => true));
      const res = await page.evaluate(measure, { tolerance: TOLERANCE, stress: STRESS, long: LONG });
      rows += res.rows;
      for (const f of res.findings) {
        found++;
        report.push({ engine, width, fonts, path, ...f });
        console.log(`${engine} ${width}px${fonts ? '' : ' no-fonts'} ${path}  ${f.grid}  [${f.blocks} blocks, first: "${f.first}"]\n    ${f.problems.join('; ')}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  total += found;
  console.log(`${engine}: ${list.length} pages × ${passes.length} passes, ${rows} rows measured${STRESS ? ' (as built and under stress)' : ''}, ${found} misaligned`);
}
server.close();
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
console.log(total ? `${total} misaligned row(s)` : 'side-by-side rows: all aligned');
process.exit(total ? 1 : 0);
