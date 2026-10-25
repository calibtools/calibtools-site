#!/usr/bin/env node
/**
 * brand-overlay.mjs — Node wrapper for the Python brand-overlay pipeline.
 *
 * Usage:
 *   node scripts/brand-overlay.mjs detect   # detect boards, write JSON + previews
 *   node scripts/brand-overlay.mjs overlay  # render overlays, colour-correct, output WebP
 *
 * Requires: python3 with opencv-python-headless, Pillow, numpy
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = join(__dirname, 'brand-overlay.py');
const command = process.argv[2];

if (!command || !['detect', 'overlay'].includes(command)) {
  console.error('Usage: node scripts/brand-overlay.mjs <detect|overlay>');
  process.exit(1);
}

try {
  execFileSync('python3', [script, command], { stdio: 'inherit' });
} catch (e) {
  process.exit(e.status ?? 1);
}
