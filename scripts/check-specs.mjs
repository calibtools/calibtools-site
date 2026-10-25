if (process.env.SKIP_SPECS_CHECK === '1') { console.log('[check-specs] Skipped (SKIP_SPECS_CHECK=1)'); process.exit(0); }
/**
 * Postbuild check: verify required spec metafields are present in every
 * rendered product page in dist/targets/{handle}/index.html.
 *
 * Fails the build if required keys are missing from the spec table.
 * Warns if datasheet_url is missing (no link icon in the Downloads section).
 *
 * Bypass: SKIP_SPECS_CHECK=1
 *
 * The spec table renders metafield keys as human-readable labels via the
 * SPEC_LABELS map in src/pages/targets/[handle].astro. This script checks
 * for those labels in the rendered HTML.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (process.env.SKIP_SPECS_CHECK === '1') {
  console.log('[check-specs] Skipped (SKIP_SPECS_CHECK=1)');
  process.exit(0);
}

// --- Label map: metafield key → rendered label ---
// Must match SPEC_LABELS in src/pages/targets/[handle].astro
const KEY_TO_LABEL = {
  material:          'Material',
  thickness_mm:      'Thickness',
  feature_tolerance: 'Feature tolerance',
  lead_time:         'Lead time',
  files_included:    'Files included',
};

const REQUIRED_KEYS = ['material', 'thickness_mm', 'feature_tolerance', 'lead_time', 'files_included'];
const WARN_KEYS = ['datasheet_url']; // checked via Downloads section

const DIST = resolve('dist/targets');

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
  const htmlPath = resolve(DIST, entry.name, 'index.html');
  if (!existsSync(htmlPath)) continue;

  const html = readFileSync(htmlPath, 'utf-8');
  const handle = entry.name;

  // Check if the page has a spec table (heading "Specifications")
  const hasSpecTable = html.includes('>Specifications<');

  const missing = [];
  const warnings = [];

  if (hasSpecTable) {
    // Check required labels in spec table
    for (const key of REQUIRED_KEYS) {
      const label = KEY_TO_LABEL[key];
      if (!label) continue; // no label mapping = can't check
      // Look for the label as a table cell: >Label<
      if (!html.includes(`>${label}<`)) {
        missing.push(key);
      }
    }
  } else {
    // No spec table at all — all required keys are missing
    missing.push(...REQUIRED_KEYS);
  }

  // Check for datasheet link (Downloads section with .pdf link)
  for (const key of WARN_KEYS) {
    if (key === 'datasheet_url') {
      // The datasheet renders as a filename link containing "-datasheet"
      if (!html.includes('-datasheet')) {
        warnings.push(key);
      }
    }
  }

  if (missing.length > 0) hasErrors = true;

  results.push({ handle, missing, warnings, hasSpecTable });
}

// --- Print table ---
console.log('\n[check-specs] Product spec completeness:\n');
console.log('  Handle                      Specs  Missing                                  Warnings');
console.log('  ' + '─'.repeat(90));

for (const r of results) {
  const status = r.missing.length === 0 ? '✓' : '✗';
  const missingStr = r.missing.length > 0 ? r.missing.join(', ') : '—';
  const warnStr = r.warnings.length > 0 ? r.warnings.join(', ') : '—';
  console.log(
    `  ${r.handle.padEnd(30)} ${status.padEnd(7)} ${missingStr.padEnd(41)} ${warnStr}`,
  );
}

console.log('');

if (hasErrors) {
  console.error('[check-specs] FAIL — required spec metafields missing. Set SKIP_SPECS_CHECK=1 to bypass while filling metafields.\n');
  process.exit(1);
} else {
  console.log('[check-specs] OK — all required spec metafields present.\n');
}
