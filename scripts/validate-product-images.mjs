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
const SKIP_DIRS = new Set(['brand']);
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

if (errors.length > 0) {
  console.error('❌ Product image validation failed:\n');
  for (const e of errors) console.error(`  • ${e}`);
  console.error(`\n${errors.length} error(s) in ${JSON_PATH}`);
  process.exit(1);
}

console.log(`✓ images.json: ${catalog.length} entries validated, all files present.`);
