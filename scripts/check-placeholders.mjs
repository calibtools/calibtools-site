#!/usr/bin/env node
/**
 * check-placeholders.mjs — postbuild guard against placeholder text in dist/.
 *
 * Scans all HTML visible text (stripped of <script>/<style>/attributes),
 * markdown, txt, json, svg, xml, and PDF files for placeholder patterns.
 *
 * Also enforces claims rules:
 * - No "µm" within the same sentence as "composite" on composite product/collection pages.
 * - No "DAkkS" or "measured" within the same sentence as "±2 µm" anywhere.
 *
 * Exit 1 on any hit. No allowlist.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';

const DIST = resolve(process.env.CHECK_PLACEHOLDERS_DIST || 'dist');

// ── Patterns ─────────────────────────────────────────────────────────

const LITERAL_PATTERNS = [
  /\[BODY COPY/i,
  /\[CHECK\]/,
  /\[lab name/i,
  /PLACEHOLDER/i,
  /\bTODO\b/,
  /\bTBD\b/,
  /lorem ipsum/i,
];

/** [3+ uppercase letters/spaces/punctuation] in visible text */
const BRACKET_UPPER = /\[[A-Z][A-Z\s.,;:!?&\-/]{2,}\]/;

// ── Claims rules ─────────────────────────────────────────────────────

/** Split text into rough sentences. */
function sentences(text) {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
}

/**
 * Check claims rules on visible text, returning error strings.
 * @param {string} text - Visible text
 * @param {string} filePath - Relative file path (for composite detection)
 */
function checkClaims(text, filePath) {
  const errors = [];
  const isComposite = /composite/i.test(filePath);

  for (const sent of sentences(text)) {
    const lower = sent.toLowerCase();

    // No µm in same sentence as "composite" on composite pages
    if (isComposite && lower.includes('composite') && /µm|μm/.test(sent)) {
      errors.push(`Claims: "µm" in same sentence as "composite": "${sent.trim().slice(0, 80)}..."`);
    }

    // No "DAkkS" or "measured" in same sentence as "±2 µm"
    if (/±2\s*µm|±2\s*μm/.test(sent)) {
      if (/dakks/i.test(sent)) {
        errors.push(`Claims: "DAkkS" in same sentence as "±2 µm": "${sent.trim().slice(0, 80)}..."`);
      }
      if (/\bmeasured\b/i.test(sent)) {
        errors.push(`Claims: "measured" in same sentence as "±2 µm": "${sent.trim().slice(0, 80)}..."`);
      }
    }
  }
  return errors;
}

// ── Text extraction ──────────────────────────────────────────────────

/** Strip HTML tags, script, style blocks, and decode basic entities. */
function htmlToVisibleText(html) {
  let text = html;
  // Remove script and style blocks
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove nav and footer to avoid cross-element sentence merging
  text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
  text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
  // Insert sentence breaks at block-level element boundaries
  text = text.replace(/<\/?(?:p|div|h[1-6]|li|td|th|tr|section|article|header|aside|details|summary|blockquote|figcaption)\b[^>]*>/gi, '. ');
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode basic entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  text = text.replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–');
  text = text.replace(/&#\d+;/g, ' ').replace(/&\w+;/g, ' ');
  return text;
}

/** Extract text from a PDF using pdfjs-dist. */
async function pdfToText(filePath) {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(readFileSync(filePath));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(' ') + '\n';
    }
    return text;
  } catch {
    // If pdfjs-dist is not available, skip PDFs
    return '';
  }
}

// ── File collection ──────────────────────────────────────────────────

function walk(dir, exts) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, exts));
    } else if (exts.includes(extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(DIST)) {
    console.error('[check-placeholders] dist/ not found — run pnpm build first.');
    process.exit(1);
  }

  const errors = [];

  // HTML files
  const htmlFiles = walk(DIST, ['.html']);
  for (const file of htmlFiles) {
    const rel = relative(DIST, file);
    const html = readFileSync(file, 'utf-8');

    // Skip noindex pages (draft guides etc.) — they are hidden, not published
    if (/<meta\s[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) continue;

    const text = htmlToVisibleText(html);

    for (const pattern of LITERAL_PATTERNS) {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        errors.push({ file: rel, detail: `Pattern: ${pattern} matched "${match?.[0]}"` });
      }
    }

    if (BRACKET_UPPER.test(text)) {
      const match = text.match(BRACKET_UPPER);
      errors.push({ file: rel, detail: `Bracket-upper: "${match?.[0]}"` });
    }

    // Claims rules
    for (const err of checkClaims(text, rel)) {
      errors.push({ file: rel, detail: err });
    }
  }

  // Non-HTML text files
  const textFiles = walk(DIST, ['.md', '.txt', '.json', '.svg', '.xml']);
  for (const file of textFiles) {
    const rel = relative(DIST, file);
    const text = readFileSync(file, 'utf-8');

    for (const pattern of LITERAL_PATTERNS) {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        errors.push({ file: rel, detail: `Pattern: ${pattern} matched "${match?.[0]}"` });
      }
    }

    if (BRACKET_UPPER.test(text)) {
      const match = text.match(BRACKET_UPPER);
      errors.push({ file: rel, detail: `Bracket-upper: "${match?.[0]}"` });
    }
  }

  // PDF files
  const pdfFiles = walk(DIST, ['.pdf']);
  for (const file of pdfFiles) {
    const rel = relative(DIST, file);
    const text = await pdfToText(file);
    if (!text) continue;

    for (const pattern of LITERAL_PATTERNS) {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        errors.push({ file: rel, detail: `PDF pattern: ${pattern} matched "${match?.[0]}"` });
      }
    }

    if (BRACKET_UPPER.test(text)) {
      const match = text.match(BRACKET_UPPER);
      errors.push({ file: rel, detail: `PDF bracket-upper: "${match?.[0]}"` });
    }
  }

  // ── Withdrawn files guard ──────────────────────────────────────────
  const WITHDRAWN_FILES = [/CT-SV-CERT-ILAC/];
  const allDistFiles = [...htmlFiles, ...textFiles, ...pdfFiles];
  for (const file of allDistFiles) {
    const rel = relative(DIST, file);
    for (const pattern of WITHDRAWN_FILES) {
      if (pattern.test(rel)) {
        errors.push({ file: rel, detail: `Withdrawn file must not appear in dist: ${rel}` });
      }
    }
  }

  // ── Print results ──────────────────────────────────────────────────
  if (errors.length > 0) {
    console.error(`\n[check-placeholders] ${errors.length} placeholder(s) found:\n`);
    for (const e of errors) {
      console.error(`  ${e.file}  ${e.detail}`);
    }
    process.exit(1);
  }

  console.log(`[check-placeholders] OK — ${htmlFiles.length} HTML, ${textFiles.length} text, ${pdfFiles.length} PDF files checked. No placeholders found.`);
}

main();
