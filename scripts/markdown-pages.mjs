#!/usr/bin/env node
/**
 * markdown-pages.mjs — postbuild: write a Markdown version of every page in the sitemap
 * (dist/<path>/index.md), from the page's <main>. The middleware serves it to requests that ask for
 * text/markdown first (AI agents); browsers keep getting HTML. Build-time only.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const SITE = 'https://calib.tools';
// <form> stays: the generator pages keep their heading and explanations inside the form; its controls go
const DROP = ['script', 'style', 'noscript', 'svg', 'button', 'select', 'datalist', 'nav', 'dialog', 'template', 'iframe'];

/** Inner HTML of <main>, without the elements that carry no readable text. */
export function mainHtml(html) {
  const m = /<main\b[^>]*>([\s\S]*)<\/main>/i.exec(html);
  let s = m ? m[1] : '';
  for (const tag of DROP) s = s.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
  return s.replace(/<(input|select|textarea)\b[^>]*>/gi, '');
}

function converter(base = SITE) {
  const t = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
  t.use(gfm);
  t.addRule('absoluteLinks', {
    filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
    replacement: (content, node) => {
      const href = node.getAttribute('href');
      // short tab labels ("FOV") read better as their full title ("FOV & resolution calculator")
      const title = node.getAttribute('title');
      const text = (title && content.trim().length <= 12 ? title : content).trim();
      if (!text) return '';
      let abs;
      try { abs = new URL(href, base).href; } catch { return text; }
      // all-caps labels ("FAQ", "HALCON") as text + autolink: "[FAQ]" reads like an unfilled placeholder
      return /^[A-Z][A-Z\s.&\-/]{2,}$/.test(text) ? `${text} <${abs}>` : `[${text}](${abs})`;
    },
  });
  t.addRule('imagesAsAlt', {
    filter: 'img',
    replacement: (_c, node) => (node.getAttribute('alt') ? `*${node.getAttribute('alt')}*` : ''),
  });
  return t;
}

const textOf = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/\s+/g, ' ').trim();

export function pageMarkdown(html, { url, lastmod } = {}) {
  const main = mainHtml(html);
  const h1Html = (/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(main) ?? [])[1];
  const h1 = h1Html ? textOf(h1Html) : '';
  let body = converter(url || SITE).turndown(main).replace(/\n{3,}/g, '\n\n').trim();
  if (h1) {
    // drop the converted heading; the page title goes first, then where the page lives and when it changed
    const line = body.split('\n').findIndex((l) => l.startsWith('# ') && l.slice(2).replace(/\\/g, '').trim() === h1);
    if (line >= 0) body = body.split('\n').filter((_, i) => i !== line).join('\n').trim();
  }
  const meta = [url && `Source: ${url}`, lastmod && `Last updated: ${lastmod}`].filter(Boolean).join('  \n');
  return `${h1 ? `# ${h1}\n\n` : ''}${meta}\n\n${body}\n`;
}

export function markdownPath(url) {
  return `${new URL(url).pathname.replace(/^\//, '')}index.md`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const DIST = resolve(import.meta.dirname, '..', 'dist');
  const entries = readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f))
    .flatMap((f) => [...readFileSync(join(DIST, f), 'utf-8').matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)])
    .map((m) => ({ url: m[1], lastmod: m[2] ?? null }));
  let n = 0;
  for (const e of entries) {
    const file = join(DIST, new URL(e.url).pathname, 'index.html');
    if (!existsSync(file)) continue;
    writeFileSync(join(DIST, markdownPath(e.url)), pageMarkdown(readFileSync(file, 'utf-8'), e));
    n++;
  }
  console.log(`[markdown-pages] Wrote ${n} Markdown page(s).`);
}
