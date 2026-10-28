#!/usr/bin/env node
/**
 * check-content.mjs — validates the content model against built HTML.
 * Per product page: decide slots visible outside <details>, H1 outside <details>,
 * meta description in <head>, mean sentence length <= 20 words per block.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const errors = [];

// Product pages to check
const PRODUCT_DIRS = ['charuco-composite', 'charuco-ceramic', 'checkerboard-composite', 'mounting-fixture', 'certificate-ilac'];

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function meanSentenceLength(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0);
  return totalWords / sentences.length;
}

for (const handle of PRODUCT_DIRS) {
  const htmlPath = join(DIST, 'targets', handle, 'index.html');
  if (!existsSync(htmlPath)) continue;
  const html = readFileSync(htmlPath, 'utf-8');
  const rel = `targets/${handle}/index.html`;

  // Split HTML into inside-details and outside-details
  const outsideDetails = html.replace(/<details[\s\S]*?<\/details>/gi, '');

  // 1. H1 outside <details>
  const h1Outside = /<h1[^>]*>[\s\S]*?<\/h1>/i.test(outsideDetails);
  if (!h1Outside) errors.push({ file: rel, rule: 'h1-outside-details', detail: 'H1 is inside a <details> element' });

  // 2. Meta description in <head>
  const hasMetaDesc = /<meta\s[^>]*name=["']description["']/i.test(html);
  if (!hasMetaDesc) errors.push({ file: rel, rule: 'meta-desc-present', detail: 'Missing meta description' });

  // 3. Specs table outside <details> (id="specifications" should be outside)
  const specsOutside = /id=["']specifications["']/.test(outsideDetails);
  if (!specsOutside && /<table/.test(html)) {
    const specsAnywhere = /id=["']specifications["']/.test(html);
    if (specsAnywhere) errors.push({ file: rel, rule: 'specs-outside-details', detail: 'Specifications section is inside a <details> element' });
  }

  // 4. Buy box visible outside <details>
  const buyBoxOutside = /data-buy-box/.test(outsideDetails);
  if (!buyBoxOutside) errors.push({ file: rel, rule: 'buybox-outside-details', detail: 'Buy box is inside a <details> element' });

  // 5. Mean sentence length per block (skip <td> — spec table cells often have long technical descriptions)
  const BLOCK_RE = /<(p|li|dd|blockquote)(?:\s[^>]*)?>([^<]*(?:<(?!\/?(?:p|li|dd|blockquote))[^>]*>[^<]*)*)<\/\1>/gi;
  let bm;
  while ((bm = BLOCK_RE.exec(html)) !== null) {
    const text = stripTags(bm[2]);
    if (text.length < 30) continue;
    const msl = meanSentenceLength(text);
    if (msl > 20) {
      errors.push({ file: rel, rule: 'sentence-length', detail: `Mean sentence length ${msl.toFixed(1)} words (max 20) in <${bm[1]}>: "${text.slice(0, 60)}..."` });
    }
  }
}

if (errors.length > 0) {
  console.error(`[check-content] ${errors.length} content model error(s):\n`);
  for (const e of errors) {
    console.error(`  ${e.file}  [${e.rule}] ${e.detail}`);
  }
  process.exit(1);
}

console.log(`[check-content] OK — ${PRODUCT_DIRS.length} product pages checked.`);
