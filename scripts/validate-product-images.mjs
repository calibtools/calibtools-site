#!/usr/bin/env node
/**
 * Build-time validation for src/assets/products/images.json.
 *
 * Checks:
 * 1. Every `kind` is one of ai | render | photo.
 * 2. Every `file` path exists on disk.
 * 3. Every `handle` folder referenced exists.
 * 4. Every WebP in a handle folder (excluding brand/) is listed in the JSON.
 *
 * Exits non-zero with a clear message on any failure.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', 'src', 'assets', 'products');
const JSON_PATH = join(ROOT, 'images.json');

const catalog = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
const VALID_KINDS = new Set(['ai', 'render', 'photo']);
const errors = [];

// Track files listed in JSON per handle
const jsonFiles = new Map(); // handle → Set<file>

for (const entry of catalog) {
  const { handle, file, kind } = entry;

  // 1. Kind enum
  if (!VALID_KINDS.has(kind)) {
    errors.push(`${handle}/${file}: invalid kind "${kind}" (expected ai | render | photo)`);
  }

  // 2. File exists
  const filePath = join(ROOT, handle, file);
  if (!existsSync(filePath)) {
    errors.push(`${handle}/${file}: file not found at ${filePath}`);
  }

  // 3. Handle folder exists
  const handleDir = join(ROOT, handle);
  if (!existsSync(handleDir) || !statSync(handleDir).isDirectory()) {
    errors.push(`${handle}/${file}: handle folder "${handleDir}" does not exist`);
  }

  // Track
  if (!jsonFiles.has(handle)) jsonFiles.set(handle, new Set());
  jsonFiles.get(handle).add(file);
}

// 4. Every WebP in handle folders is listed in JSON (skip brand/, report.md)
const SKIP_DIRS = new Set(['brand', 'packaging']);
for (const dirName of readdirSync(ROOT)) {
  const dirPath = join(ROOT, dirName);
  if (!statSync(dirPath).isDirectory()) continue;
  if (SKIP_DIRS.has(dirName)) continue;

  const pngs = readdirSync(dirPath).filter(f => f.endsWith('.webp'));
  const listed = jsonFiles.get(dirName) ?? new Set();

  for (const png of pngs) {
    if (!listed.has(png)) {
      errors.push(`${dirName}/${png}: file exists on disk but is not listed in images.json`);
    }
  }
}

// 5. Scan src/ and docs/ for asset references whose targets don't exist on disk
const SRC_ROOT = resolve(import.meta.dirname, '..', 'src');
const DOCS_ROOT = resolve(import.meta.dirname, '..', 'docs');
const SCAN_EXTS = new Set(['.astro', '.ts', '.tsx', '.md', '.mdx', '.json', '.mjs']);
const ASSET_REF_RE = /assets\/products\/[^\s"')]+/g;

function scanDir(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      scanDir(full);
    } else if (SCAN_EXTS.has('.' + entry.name.split('.').pop())) {
      const content = readFileSync(full, 'utf-8');
      for (const match of content.matchAll(ASSET_REF_RE)) {
        const ref = match[0];
        // Resolve relative to the project src/assets/products root
        const refFile = ref.replace(/^.*assets\/products\//, '');
        // Skip globs and template literals — only check concrete file paths
        if (/[*${}]/.test(refFile)) continue;
        const target = join(ROOT, refFile);
        if (!existsSync(target)) {
          errors.push(`${full}: references assets/products/${refFile} but file does not exist`);
        }
      }
    }
  }
}
scanDir(SRC_ROOT);
scanDir(DOCS_ROOT);

if (errors.length > 0) {
  console.error('❌ Product image validation failed:\n');
  for (const e of errors) console.error(`  • ${e}`);
  console.error(`\n${errors.length} error(s)`);
  process.exit(1);
}

console.log(`✓ images.json: ${catalog.length} entries validated, all files present.`);
console.log(`✓ No broken asset references in src/ or docs/.`);
