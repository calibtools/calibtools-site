#!/usr/bin/env node
/**
 * Lighthouse on the built site (DESIGN.md / VI v3 §8.3).
 *   accessibility >= 95 and zero color-contrast failures  → build fails otherwise
 *   performance  >= 90                                     → warning only (CI machines vary)
 * Needs ./dist and a Chrome: CHROME_PATH, or Playwright's Chromium.
 * Lighthouse runs through npx at a pinned version, so it is not a project dependency.
 */
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const LIGHTHOUSE = 'lighthouse@13.6.0';
const PORT = 4399;
const PAGES = ['/', '/targets/', '/targets/charuco-composite/', '/tools/generator/'];
const MIN_A11Y = 95, MIN_PERF = 90;
const ROOT = resolve(import.meta.dirname, '..');

if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('[lighthouse] dist/ not found. Run the build first.');
  process.exit(1);
}

let chrome = process.env.CHROME_PATH;
if (!chrome) {
  const { chromium } = await import('@playwright/test');
  chrome = chromium.executablePath();
}
if (!chrome || !existsSync(chrome)) {
  console.error('[lighthouse] No Chrome found. Set CHROME_PATH or install Playwright Chromium.');
  process.exit(1);
}

const server = spawn(process.execPath, [join(ROOT, 'scripts', 'serve-dist.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const out = mkdtempSync(join(tmpdir(), 'lh-'));
let failed = false;
try {
  for (const page of PAGES) {
    const file = join(out, `${page.replace(/\W+/g, '_') || 'home'}.json`);
    execFileSync('npx', ['--yes', LIGHTHOUSE, `http://localhost:${PORT}${page}`, '--quiet',
      '--chrome-flags=--headless=new --no-sandbox', '--only-categories=performance,accessibility',
      '--output=json', `--output-path=${file}`], { env: { ...process.env, CHROME_PATH: chrome }, stdio: ['ignore', 'ignore', 'inherit'], timeout: 180_000 });
    const r = JSON.parse(readFileSync(file, 'utf-8'));
    const perf = Math.round(r.categories.performance.score * 100);
    const a11y = Math.round(r.categories.accessibility.score * 100);
    const contrast = r.audits['color-contrast'];
    const contrastFails = contrast?.score === 0 ? (contrast.details?.items ?? []) : [];
    console.log(`[lighthouse] ${page.padEnd(32)} performance ${perf}  accessibility ${a11y}  contrast failures ${contrastFails.length}`);
    for (const ref of r.categories.accessibility.auditRefs) {
      const a = r.audits[ref.id];
      if (a.score === 0) for (const it of (a.details?.items ?? []).slice(0, 5)) console.log(`    ${a.id}: ${(it.node?.snippet ?? '').slice(0, 140)}`);
    }
    if (a11y < MIN_A11Y) { failed = true; console.error(`::error::Lighthouse accessibility ${a11y} < ${MIN_A11Y} on ${page}`); }
    if (contrastFails.length) { failed = true; console.error(`::error::${contrastFails.length} color-contrast failure(s) on ${page}`); }
    if (perf < MIN_PERF) console.log(`::warning::Lighthouse performance ${perf} < ${MIN_PERF} on ${page}`);
  }
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
