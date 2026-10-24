/**
 * SKU convention check: reads all variants via Storefront API and fails
 * if any SKU does not match the expected pattern.
 *
 * Pattern: PREFIX-MATERIAL-...
 *   PREFIX:   CHT|CHA|APR|CIR|ACR|HAL|CBM|VND|CUS|CUB|LUM|LDR|IRT|IQC|SPH|TCP|RES|ACC|SVC|OEM
 *   MATERIAL: P|C|G|Q|O|F|H|A|S|X
 *
 * Full regex: /^(CHT|CHA|APR|CIR|ACR|HAL|CBM|VND|CUS|CUB|LUM|LDR|IRT|IQC|SPH|TCP|RES|ACC|SVC|OEM)-[PCGQOFHASX]-/
 *
 * Usage:
 *   node scripts/check-skus.mjs          # exits 1 on violations
 *   node scripts/check-skus.mjs --warn   # exits 0 even with violations (CI warning mode)
 *
 * Requires PUBLIC_SHOPIFY_DOMAIN and PUBLIC_SHOPIFY_STOREFRONT_TOKEN.
 */

import { readFileSync } from 'node:fs';

// --- Load .env ---
try {
  const envFile = readFileSync('.env', 'utf-8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
} catch { /* no .env */ }

const domain = process.env.PUBLIC_SHOPIFY_DOMAIN;
const token = process.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

if (!domain || !token) {
  console.error('Missing PUBLIC_SHOPIFY_DOMAIN or PUBLIC_SHOPIFY_STOREFRONT_TOKEN');
  process.exit(1);
}

const warnOnly = process.argv.includes('--warn');

/** @type {RegExp} */
export const SKU_PATTERN = /^(CHT|CHA|APR|CIR|ACR|HAL|CBM|VND|CUS|CUB|LUM|LDR|IRT|IQC|SPH|TCP|RES|ACC|SVC|OEM)-[PCGQOFHASX]-/;

// --- Query ---

const query = `{
  products(first: 100) {
    nodes {
      handle title
      variants(first: 100) {
        nodes { sku title }
      }
    }
  }
}`;

const res = await fetch(`https://${domain}/api/2025-07/graphql.json`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': token,
  },
  body: JSON.stringify({ query }),
});

if (!res.ok) {
  console.error(`Storefront API ${res.status}: ${res.statusText}`);
  process.exit(1);
}

const json = await res.json();
if (json.errors?.length) {
  console.error(`Storefront API error: ${json.errors[0].message}`);
  process.exit(1);
}

const products = json.data.products.nodes;
const offenders = [];
let totalVariants = 0;

for (const p of products) {
  for (const v of p.variants.nodes) {
    if (!v.sku) continue; // skip variants without SKU
    totalVariants++;
    if (!SKU_PATTERN.test(v.sku)) {
      offenders.push({
        handle: p.handle,
        variant: v.title,
        sku: v.sku,
      });
    }
  }
}

// --- Output ---

console.log(`\n[check-skus] Checked ${totalVariants} variants across ${products.length} products.\n`);

if (offenders.length === 0) {
  console.log('[check-skus] OK — all SKUs match convention.\n');
  process.exit(0);
}

console.log(`[check-skus] ${offenders.length} SKU${offenders.length !== 1 ? 's' : ''} violate convention:\n`);
console.log('  SKU                           Product                         Variant');
console.log('  ' + '─'.repeat(85));

for (const o of offenders) {
  console.log(`  ${o.sku.padEnd(32)} ${o.handle.padEnd(32)} ${o.variant}`);
}

console.log('');
console.log(`  Expected pattern: PREFIX-MATERIAL-... where`);
console.log(`    PREFIX:   CHT|CHA|APR|CIR|ACR|HAL|CBM|VND|CUS|CUB|LUM|LDR|IRT|IQC|SPH|TCP|RES|ACC|SVC|OEM`);
console.log(`    MATERIAL: P(composite) C(ceramic) G(glass) Q(quartz) O(polymer) F(film) H(chrome) A(aluminium) S(steel) X(other)`);
console.log('');

if (warnOnly) {
  console.log('[check-skus] WARNING — violations found but --warn mode, exiting 0.\n');
  process.exit(0);
} else {
  console.error('[check-skus] FAIL — SKU convention violations found. Use --warn for CI warning-only mode.\n');
  process.exit(1);
}
