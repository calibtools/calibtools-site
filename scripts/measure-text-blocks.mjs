#!/usr/bin/env node
/**
 * measure-text-blocks.mjs — measure every block element's own text in dist/.
 * Reports blocks >= 300 chars with source classification.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const THRESHOLD = 300;

function findHtml(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...findHtml(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const BLOCK_TAGS = ['p', 'li', 'td', 'th', 'figcaption', 'blockquote', 'dd', 'dt', 'summary', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const TAG_RE = new RegExp(`<(${BLOCK_TAGS.join('|')})(\\s[^>]*)?>([\\s\\S]*?)</\\1>`, 'gi');

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
}

const results = [];

for (const file of findHtml(DIST)) {
  const html = readFileSync(file, 'utf-8');
  const page = '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\.html$/, '');
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    const text = stripTags(m[3]);
    if (text.length >= THRESHOLD) {
      let source = 'component literal';
      if (m[0].includes('set:html')) source = 'Shopify descriptionHtml';
      results.push({ page, tag, chars: text.length, text: text.slice(0, 80), source });
    }
  }
}

console.log(`[measure-text-blocks] ${results.length} blocks >= ${THRESHOLD} chars found.\n`);
if (results.length > 0) {
  console.log('| Page | Tag | Chars | Source | Preview |');
  console.log('|---|---|---|---|---|');
  for (const r of results) {
    console.log(`| ${r.page} | <${r.tag}> | ${r.chars} | ${r.source} | ${r.text}... |`);
  }
}
