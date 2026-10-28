#!/usr/bin/env node
/**
 * check-prose.mjs — warn when any <p> text exceeds ~3 lines at 640 px
 * (~360 characters). Also fail the build on banned location/claim phrases.
 */
import { globSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const THRESHOLD = 300;
const ROOT = resolve(import.meta.dirname, '..');

// ---------------------------------------------------------------------------
// Banned phrases — build fails on a hit
// ---------------------------------------------------------------------------

const BANNED_PATTERNS = [
  /\bMunich\b/i,
  /\bMünchen\b/i,
  /ships?\s+from\s+Germany/i,
  /from\s+Germany/i,
  /\bEU\s+stock\b/i,
  /\bin\s+stock\b/i,
  /\bInspected\s+in\s+Germany\b/i,
  /\bGerman[- ]made\b/i,
  /\bMade\s+in\s+Germany\b/i,
  /\bverified\b/i,
  /\bcertified\b/i,
  /days\s+delivery/i,
  /Calibrate\s+with\s+Confidence/i,
  /Shipped\s+fast/i,
  /2[\u2013-]4\s*days/i,
  /ships?\s+in\s+\d*\s*days/i,
  /DAkkS[- ]certified/i,
  /certified\s+by\s+DAkkS/i,
  /DAkkS\s+certificate\s+included/i,
  /our\s+DAkkS\s+certificate/i,
  /\blab[- ]grade\b/i,
  /\bfactor\s+10\b/i,
  /\bverified\s+buyer\b/i,
  /\bverified\s+purchase\b/i,
  /100\s*%?\s*real\s+reviews/i,
  /\ball\s+5[- ]star\b/i,
  /±0\.5[\u2013-]2/,
  /±1[\u2013-]2/,
  /0\.5[\u2013-]2\s*µm/,
];

/** Phrases that are allowed even when they contain a banned word. */
const ALLOWLIST = [
  'accredited third-party laboratory',
  'CNAS-accredited',
  'DAkkS-accredited',
  'DAkkS-accredited laboratory',
  'DAkkS-calibrated',
  'certificate from a DAkkS-accredited laboratory',
];

/**
 * Test whether a line contains a banned phrase that is NOT inside an
 * allowlisted context.
 */
function findBannedHit(line) {
  for (const pattern of BANNED_PATTERNS) {
    const m = pattern.exec(line);
    if (!m) continue;
    const matchText = m[0];
    // Check if the match sits inside an allowlisted phrase
    const allowed = ALLOWLIST.some((phrase) => {
      const idx = line.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx === -1) return false;
      // The banned match must be fully inside the allowlisted span
      return m.index >= idx && m.index + matchText.length <= idx + phrase.length;
    });
    if (!allowed) return matchText;
  }
  return null;
}

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

const proseFiles = [
  ...globSync('src/content/**/*.{md,mdx}', { cwd: ROOT }).map((f) => resolve(ROOT, f)),
  ...globSync('src/**/*.astro', { cwd: ROOT }).map((f) => resolve(ROOT, f)),
];

const bannedScanFiles = [
  ...globSync('src/**/*.{astro,ts,tsx,md,mdx}', { cwd: ROOT }).map((f) => resolve(ROOT, f)),
  ...globSync('docs/datasheets/**/*.md', { cwd: ROOT }).map((f) => resolve(ROOT, f)),
].filter((f) => {
  const rel = relative(ROOT, f);
  // Exclude test files, internal reports, brand docs (which list banned phrases), and code comments in lib utilities
  if (rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')) return false;
  if (rel === 'src/assets/products/report.md') return false;
  if (rel.startsWith('docs/brand/')) return false;
  return true;
});

// ---------------------------------------------------------------------------
// Prose length check (warn-only)
// ---------------------------------------------------------------------------

const offenders = [];

for (const file of proseFiles) {
  const src = readFileSync(file, 'utf-8');
  const lines = src.split('\n');
  const ext = file.endsWith('.astro') ? 'astro' : 'md';

  if (ext === 'astro') {
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

// ---------------------------------------------------------------------------
// Banned-phrase check (build-breaking)
// ---------------------------------------------------------------------------

const banned = [];

for (const file of bannedScanFiles) {
  const src = readFileSync(file, 'utf-8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const hit = findBannedHit(lines[i]);
    if (hit) {
      banned.push({ file: relative(ROOT, file), line: i + 1, match: hit });
    }
  }
}

if (banned.length > 0) {
  console.error(`\n[check-prose] BANNED PHRASES FOUND — build must not proceed:`);
  for (const b of banned) {
    console.error(`  ${b.file}:${b.line}  "${b.match}"`);
  }
  process.exit(1);
}

console.log('[check-prose] OK — no banned phrases found.');

// ---------------------------------------------------------------------------
// Card text check (build-breaking) — [data-card] elements <= 220 chars
// ---------------------------------------------------------------------------

import { existsSync, readdirSync } from 'node:fs';
import { join as pathJoin } from 'node:path';

const CARD_THRESHOLD = 220;
const distDir = resolve(ROOT, 'dist');
const cardErrors = [];

if (existsSync(distDir)) {
  function findHtmlFiles(dir) {
    const results = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = pathJoin(dir, entry.name);
      if (entry.isDirectory()) results.push(...findHtmlFiles(full));
      else if (entry.name.endsWith('.html')) results.push(full);
    }
    return results;
  }

  for (const file of findHtmlFiles(distDir)) {
    const html = readFileSync(file, 'utf-8');
    const cardRe = /<a[^>]*data-card[^>]*>([\s\S]*?)<\/a>/gi;
    let cm;
    while ((cm = cardRe.exec(html)) !== null) {
      const text = cm[1].replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > CARD_THRESHOLD) {
        cardErrors.push({ file: relative(ROOT, file), chars: text.length, snippet: text.slice(0, 60) });
      }
    }
  }
}

if (cardErrors.length > 0) {
  console.error(`\n[check-prose] CARD TEXT TOO LONG (max ${CARD_THRESHOLD} chars):`);
  for (const e of cardErrors) {
    console.error(`  ${e.file} (${e.chars} chars) ${e.snippet}...`);
  }
  process.exit(1);
}
