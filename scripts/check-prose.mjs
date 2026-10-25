#!/usr/bin/env node
/**
 * check-prose.mjs — warn when any <p> text exceeds ~3 lines at 640 px
 * (~360 characters). Warn-only: always exits 0.
 */
import { globSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const THRESHOLD = 360;
const ROOT = resolve(import.meta.dirname, '..');

const files = [
  ...globSync('src/content/**/*.{md,mdx}', { cwd: ROOT }).map((f) => resolve(ROOT, f)),
  ...globSync('src/**/*.astro', { cwd: ROOT }).map((f) => resolve(ROOT, f)),
];

const offenders = [];

for (const file of files) {
  const src = readFileSync(file, 'utf-8');
  const lines = src.split('\n');
  const ext = file.endsWith('.astro') ? 'astro' : 'md';

  if (ext === 'astro') {
    // Match <p ...>text</p> (single-line or multiline)
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let match;
    while ((match = pRegex.exec(src)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > THRESHOLD) {
        const line = src.slice(0, match.index).split('\n').length;
        offenders.push({ file: relative(ROOT, file), line, chars: text.length, snippet: text.slice(0, 80) });
      }
    }
  } else {
    // Markdown: paragraphs are blocks separated by blank lines
    let inFrontmatter = false;
    let block = '';
    let blockStart = 0;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (i === 0 && ln.trim() === '---') { inFrontmatter = true; continue; }
      if (inFrontmatter) { if (ln.trim() === '---') inFrontmatter = false; continue; }
      if (ln.trim() === '') {
        if (block.trim()) {
          const text = block.replace(/\s+/g, ' ').trim();
          if (text.length > THRESHOLD && !text.startsWith('#') && !text.startsWith('|') && !text.startsWith('-') && !text.startsWith('*')) {
            offenders.push({ file: relative(ROOT, file), line: blockStart + 1, chars: text.length, snippet: text.slice(0, 80) });
          }
        }
        block = '';
        blockStart = i + 1;
      } else {
        if (!block) blockStart = i;
        block += ' ' + ln;
      }
    }
    // Flush last block
    if (block.trim()) {
      const text = block.replace(/\s+/g, ' ').trim();
      if (text.length > THRESHOLD && !text.startsWith('#') && !text.startsWith('|') && !text.startsWith('-') && !text.startsWith('*')) {
        offenders.push({ file: relative(ROOT, file), line: blockStart + 1, chars: text.length, snippet: text.slice(0, 80) });
      }
    }
  }
}

if (offenders.length > 0) {
  console.warn(`[check-prose] ${offenders.length} paragraph(s) exceed ${THRESHOLD} characters:`);
  for (const o of offenders) {
    console.warn(`  ${o.file}:${o.line} (${o.chars} chars) ${o.snippet}…`);
  }
} else {
  console.log(`[check-prose] OK — no paragraphs exceed ${THRESHOLD} characters.`);
}
