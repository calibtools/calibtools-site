/**
 * SKU check against the part-number registry (Part Numbering System v3).
 *
 * Reads every variant SKU via the Storefront API and compares it with
 * data/part-numbers.csv (validated by scripts/check-part-numbers.ts):
 *   - SKU equals a registry `pn`            → OK
 *   - SKU equals a registry `legacy_sku`    → awaiting migration (warning)
 *   - anything else                         → error (unregistered SKU)
 *
 * Usage:
 *   node scripts/check-skus.mjs          # exits 1 on unregistered SKUs or pending migrations
 *   node scripts/check-skus.mjs --warn   # exits 0 (CI warning mode)
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

// --- Registry ---
function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const split = (l) => { const out = []; let f = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === '"' && l[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; } else if (c === '"') q = true; else if (c === ',') { out.push(f); f = ''; } else f += c; } out.push(f); return out; };
  const head = split(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])));
}
const registry = parseCsv(readFileSync('data/part-numbers.csv', 'utf-8'));
const byPn = new Map(registry.map((r) => [r.pn, r]));
const byLegacy = new Map(registry.filter((r) => r.legacy_sku).map((r) => [r.legacy_sku, r]));


// --- Query (paginated; the Storefront API only returns published products) ---

async function gql(query, variables) {
  const res = await fetch(`https://${domain}/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) { console.error(`Storefront API ${res.status}: ${res.statusText}`); process.exit(1); }
  const json = await res.json();
  if (json.errors?.length) { console.error(`Storefront API error: ${json.errors[0].message}`); process.exit(1); }
  return json.data;
}
const products = [];
let after = null;
do {
  const data = await gql(`query($after: String) { products(first: 100, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { handle title variants(first: 250) { nodes { sku title } } } } }`, { after });
  products.push(...data.products.nodes);
  after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
} while (after);
const unregistered = [];
const pending = [];
const noSku = [];
const seen = new Set();
let totalVariants = 0;

for (const p of products) {
  for (const v of p.variants.nodes) {
    totalVariants++;
    if (!v.sku) { noSku.push({ handle: p.handle, variant: v.title }); continue; }
    seen.add(v.sku);
    if (byPn.has(v.sku)) continue;
    const legacy = byLegacy.get(v.sku);
    if (legacy) pending.push({ handle: p.handle, variant: v.title, sku: v.sku, next: legacy.pn });
    else unregistered.push({ handle: p.handle, variant: v.title, sku: v.sku });
  }
}

// Reverse check: every active registry row must be on Shopify (as new or legacy SKU).
const missing = registry.filter((r) => r.status === 'active' && !seen.has(r.pn) && !(r.legacy_sku && seen.has(r.legacy_sku)));

console.log(`\n[check-skus] Checked ${totalVariants} variants across ${products.length} published products (drafts are not visible to the Storefront API).`);
for (const o of noSku) console.log(`  NO SKU    ${o.handle} / ${o.variant}`);
for (const r of missing) console.log(`  MISSING   ${r.pn.padEnd(26)} active in registry, not on Shopify`);
for (const o of pending) console.log(`  pending   ${o.sku.padEnd(22)} → ${o.next.padEnd(26)} ${o.handle} / ${o.variant}`);
for (const o of unregistered) console.log(`  UNKNOWN   ${o.sku.padEnd(22)}   ${o.handle} / ${o.variant}`);

if (!pending.length && !unregistered.length && !noSku.length && !missing.length) {
  console.log('[check-skus] OK — every SKU is a registered part number.\n');
  process.exit(0);
}
console.log(`\n[check-skus] ${pending.length} awaiting migration, ${unregistered.length} unregistered, ${noSku.length} without SKU, ${missing.length} missing on Shopify.`);
if (warnOnly) { console.log('[check-skus] --warn mode, exiting 0.\n'); process.exit(0); }
process.exit(1);
