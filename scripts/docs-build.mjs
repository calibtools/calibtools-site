#!/usr/bin/env node
/**
 * Build all customer document PDFs.
 * Renders datasheets, writes manifest.json.
 *
 * Usage: pnpm docs:build [--sample]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const MANIFEST_PATH = resolve(ROOT, 'public/files/manifest.json');
const DS_OUT_DIR = resolve(ROOT, 'public/files/datasheets');
const IR_OUT_DIR = resolve(ROOT, 'public/files/reports');

const sample = process.argv.includes('--sample');
const watermark = sample ? 'SAMPLE' : undefined;

// ── Input hash ──────────────────────────────────────────────────────

/** Collect all files matching glob-like patterns, sorted by path. */
function collectSourceFiles() {
  const patterns = [
    { dir: 'src/docs', ext: '.ts' },
    { dir: 'docs/datasheets', ext: '.md' },
    { dir: 'src/lib', file: 'reportConfig.ts' },
    { dir: 'src/lib', file: 'claims.ts' },
  ];
  const files = [];
  for (const pat of patterns) {
    const base = resolve(ROOT, pat.dir);
    if (!existsSync(base)) continue;
    if (pat.file) {
      const fp = resolve(base, pat.file);
      if (existsSync(fp)) files.push(fp);
    } else {
      walkDir(base, pat.ext, files);
    }
  }
  return files.sort();
}

function walkDir(dir, ext, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fp = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fp, ext, out);
    } else if (!ext || entry.name.endsWith(ext)) {
      out.push(fp);
    }
  }
}

function computeInputHash() {
  const files = collectSourceFiles();
  const h = createHash('sha256');
  for (const f of files) {
    h.update(relative(ROOT, f));
    h.update(readFileSync(f));
  }
  return h.digest('hex');
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

// ── Main ────────────────────────────────────────────────────────────

/**
 * First page of a PDF as a small WebP for the files page.
 * Needs pdftoppm (poppler), the same tool check-detection uses.
 */
async function renderThumb(pdfPath, thumbPath) {
  const dir = mkdtempSync(resolve(tmpdir(), 'ct-thumb-'));
  try {
    const base = resolve(dir, 'p');
    try {
      execFileSync('pdftoppm', ['-png', '-f', '1', '-l', '1', '-scale-to-x', '720', '-scale-to-y', '-1', pdfPath, base], { stdio: 'pipe' });
    } catch (err) {
      throw new Error(`pdftoppm could not render ${relative(ROOT, pdfPath)} (is poppler installed?): ${err.message}`);
    }
    const png = readdirSync(dir).find((f) => f.endsWith('.png'));
    if (!png) throw new Error(`pdftoppm wrote no page image for ${relative(ROOT, pdfPath)}`);
    const { default: sharp } = await import('sharp');
    await sharp(resolve(dir, png)).webp({ quality: 82 }).toFile(thumbPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('[docs:build] Starting...');
  if (watermark) console.log('[docs:build] Watermark:', watermark);

  mkdirSync(DS_OUT_DIR, { recursive: true });
  mkdirSync(IR_OUT_DIR, { recursive: true });

  const inputHash = computeInputHash();
  console.log(`[docs:build] Input hash: ${inputHash.slice(0, 12)}...`);

  const manifestFiles = [];

  // ── 1. Datasheets ─────────────────────────────────────────────────

  const DS_CODES = [
    'CT-DS-CHA-C',
    'CT-DS-CHA-P',
    'CT-DS-CHT-P',
    'CT-DS-APR-P',
    'CT-DS-CIR-P',
    'CT-DS-HAL-P',
    'CT-DS-ACC-A-FIX-14',
  ];

  const { buildDS } = await import('../src/docs/build/ct-ds.ts');

  for (const code of DS_CODES) {
    const outBase = resolve(DS_OUT_DIR, code);
    console.log(`[docs:build] DS: ${code}`);
    try {
      const result = await buildDS({ code, outBase, watermark });
      const pdfPath = `${outBase}.pdf`;
      const pdfSha = sha256File(pdfPath);
      const thumbPath = `${outBase}-thumb.webp`;
      await renderThumb(pdfPath, thumbPath);
      manifestFiles.push({
        code,
        path: relative(ROOT, pdfPath),
        sha256: pdfSha,
        pages: result.pages,
        thumb: { path: relative(ROOT, thumbPath), pdfSha256: pdfSha },
      });
      console.log(`  -> ${result.pages} pages`);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      process.exit(1);
    }
  }

  // Inspection reports were rendered per serial number; there are no serial numbers for now
  // (owner decision 2026-11-22), so no reports are built here. The CT-IR builder stays in src/docs.

  // ── 3. Write manifest ─────────────────────────────────────────────

  const manifest = {
    generated: new Date().toISOString(),
    inputHash,
    files: manifestFiles,
  };

  mkdirSync(resolve(ROOT, 'public/files'), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n[docs:build] Done. ${manifestFiles.length} files. Manifest: public/files/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
