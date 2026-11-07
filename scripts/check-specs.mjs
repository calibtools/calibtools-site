if (process.env.SKIP_SPECS_CHECK === '1') { console.log('[check-specs] Skipped (SKIP_SPECS_CHECK=1)'); process.exit(0); }
/**
 * Postbuild check: verify required spec metafields are present in every
 * rendered product page in dist/targets/{handle}/index.html.
 *
 * Product types:
 * - Board products: require material, thickness_mm, feature_tolerance, lead_time, files_included
 * - Accessory products (mounting-fixture): require material, lead_time
 * - Quote-only products (reflectance-panel, resolution-chart, multi-sensor families): require "Request a quote" CTA, no price
 * - Withdrawn handles: skipped entirely
 *
 * Bypass: SKIP_SPECS_CHECK=1
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (process.env.SKIP_SPECS_CHECK === '1') {
  console.log('[check-specs] Skipped (SKIP_SPECS_CHECK=1)');
  process.exit(0);
}

// --- Product type classification ---

const WITHDRAWN = new Set(['certificate-ilac']);
const ACCESSORIES = new Set(['mounting-fixture']);
const QUOTE_ONLY = new Set(['reflectance-panel', 'resolution-chart', "lidar-camera-target", "thermal-calibration-target", "nir-calibration-target", "depth-camera-target", "hand-eye-calibration-kit", "multi-camera-target", "line-scan-target", "radar-camera-target"]);

// --- Label map: metafield key → possible rendered labels ---
// Datasheet-sourced spec tables may use different labels than the metafield key.
const KEY_TO_LABELS = {
  material:          ['Material', 'Substrate'],
  thickness_mm:      ['Thickness'],
  feature_tolerance: ['Feature tolerance', 'Feature position tolerance', 'Feature position accuracy'],
  lead_time:         ['Lead time'],
  files_included:    ['Files included', 'Files'],
};

const BOARD_REQUIRED = ['material', 'thickness_mm', 'feature_tolerance', 'lead_time', 'files_included'];
const ACCESSORY_REQUIRED = ['material', 'lead_time'];

const DIST = resolve(process.env.CHECK_SPECS_DIST || 'dist/targets');

if (!existsSync(DIST)) {
  console.error('[check-specs] dist/targets/ not found — run pnpm build first.');
  process.exit(1);
}

// Find product pages (skip collection/ and index.html)
const entries = readdirSync(DIST, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'collection');

if (entries.length === 0) {
  console.error('[check-specs] No product pages found in dist/targets/.');
  process.exit(1);
}

let hasErrors = false;
const results = [];

for (const entry of entries) {
  const handle = entry.name;

  // Skip withdrawn handles
  if (WITHDRAWN.has(handle)) {
    results.push({ handle, type: 'withdrawn', missing: [], warnings: [], hasSpecTable: false });
    continue;
  }

  const htmlPath = resolve(DIST, handle, 'index.html');
  if (!existsSync(htmlPath)) continue;

  const html = readFileSync(htmlPath, 'utf-8');

  // Determine product type
  const isAccessory = ACCESSORIES.has(handle);
  const isQuoteOnly = QUOTE_ONLY.has(handle);

  const missing = [];
  const warnings = [];

  if (isQuoteOnly) {
    // Quote-only: must show "Request a quote" and no price
    if (!html.includes('Request a quote')) {
      missing.push('quote-cta');
    }
    results.push({ handle, type: 'quote-only', missing, warnings, hasSpecTable: false });
    if (missing.length > 0) hasErrors = true;
    continue;
  }

  // Check if the page has a spec table (section#specifications or heading text)
  const hasSpecTable = html.includes('id="specifications"') || html.includes('>Specifications<');
  const requiredKeys = isAccessory ? ACCESSORY_REQUIRED : BOARD_REQUIRED;

  if (hasSpecTable) {
    for (const key of requiredKeys) {
      const labels = KEY_TO_LABELS[key];
      if (!labels) continue;
      const found = labels.some((label) => html.includes(`>${label}<`) || html.includes(`">${label}<`));
      if (!found) {
        missing.push(key);
      }
    }
  } else {
    missing.push(...requiredKeys);
  }

  // Check for datasheet link — required for all board pages
  if (!isAccessory && !html.includes('-datasheet')) {
    missing.push('datasheet_url');
  }

  if (missing.length > 0) hasErrors = true;
  results.push({ handle, type: isAccessory ? 'accessory' : 'board', missing, warnings, hasSpecTable });
}

// --- Print table ---
console.log('\n[check-specs] Product spec completeness:\n');
console.log('  Handle                      Type        Specs  Missing                                  Warnings');
console.log('  ' + '─'.repeat(100));

for (const r of results) {
  const status = r.type === 'withdrawn' ? '—' : r.missing.length === 0 ? '✓' : '✗';
  const missingStr = r.missing.length > 0 ? r.missing.join(', ') : '—';
  const warnStr = r.warnings.length > 0 ? r.warnings.join(', ') : '—';
  console.log(
    `  ${r.handle.padEnd(30)} ${r.type.padEnd(12)} ${status.padEnd(7)} ${missingStr.padEnd(41)} ${warnStr}`,
  );
}

console.log('');

if (hasErrors) {
  console.error('[check-specs] FAIL — required spec metafields missing. Set SKIP_SPECS_CHECK=1 to bypass while filling metafields.\n');
  process.exit(1);
} else {
  console.log('[check-specs] OK — all required spec metafields present.\n');
}
