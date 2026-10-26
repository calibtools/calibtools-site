#!/usr/bin/env node
/**
 * Verify document PDFs are up-to-date.
 * Fails the build if any source changed since last docs:build.
 * Run: pnpm docs:check
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const MANIFEST_PATH = resolve(ROOT, 'public/files/manifest.json');

// ── Input hash (must match docs-build.mjs exactly) ──────────────────

function collectSourceFiles() {
  const patterns = [
    { dir: 'src/docs', ext: '.ts' },
    { dir: 'docs/datasheets', ext: '.md' },
    { dir: 'data', file: 'serials.json' },
    { dir: 'data/measurements', ext: '.json' },
    { dir: 'data', file: 'sample_coords.json' },
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

// ── Main ────────────────────────────────────────────────────────────

if (!existsSync(MANIFEST_PATH)) {
  console.log('[docs:check] No manifest found at public/files/manifest.json — first-time setup, skipping check.');
  process.exit(0);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
} catch (err) {
  console.error(`[docs:check] ERROR: Could not parse manifest: ${err.message}`);
  process.exit(1);
}

const currentHash = computeInputHash();
const storedHash = manifest.inputHash;

if (currentHash === storedHash) {
  console.log(`[docs:check] OK — PDFs are up-to-date (hash: ${currentHash.slice(0, 12)}...).`);
  process.exit(0);
}

console.error(`[docs:check] ERROR: Document PDFs are stale. Source files changed since last build.`);
console.error(`  Manifest hash: ${storedHash?.slice(0, 12) ?? '(missing)'}...`);
console.error(`  Current hash:  ${currentHash.slice(0, 12)}...`);
console.error(`\nRun \`pnpm docs:build\` and commit the updated PDFs.`);
process.exit(1);
