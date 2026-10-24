#!/usr/bin/env node
/**
 * Query Storefront API for all products and print a CSV with columns:
 *   Handle, Metafield: specs.<key> [<type>], ...
 *
 * Pre-filled with current metafield values. Ready for Shopify bulk import
 * after editing.
 *
 * Usage:
 *   node scripts/export-metafield-template.mjs > products-specs.csv
 *
 * Requires PUBLIC_SHOPIFY_DOMAIN and PUBLIC_SHOPIFY_STOREFRONT_TOKEN in .env
 * or as environment variables.
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

// --- Schema (must match docs/specs-schema.md) ---

/** @type {Array<{ key: string; type: string }>} */
const SPEC_KEYS = [
  { key: 'material',          type: 'single_line_text_field' },
  { key: 'thickness_mm',      type: 'number_integer' },
  { key: 'size_mm',           type: 'single_line_text_field' },
  { key: 'pattern',           type: 'single_line_text_field' },
  { key: 'squares',           type: 'single_line_text_field' },
  { key: 'square_size_mm',    type: 'number_integer' },
  { key: 'marker_size_mm',    type: 'number_integer' },
  { key: 'dictionary',        type: 'single_line_text_field' },
  { key: 'start_id',          type: 'number_integer' },
  { key: 'feature_tolerance', type: 'single_line_text_field' },
  { key: 'flatness',          type: 'single_line_text_field' },
  { key: 'cte',               type: 'single_line_text_field' },
  { key: 'operating_temp',    type: 'single_line_text_field' },
  { key: 'weight_g',          type: 'number_integer' },
  { key: 'finish',            type: 'single_line_text_field' },
  { key: 'corner_radius_mm',  type: 'number_integer' },
  { key: 'lead_time',         type: 'single_line_text_field' },
  { key: 'files_included',    type: 'single_line_text_field' },
  { key: 'datasheet_url',     type: 'url' },
  { key: 'datasheet_rev',     type: 'single_line_text_field' },
  { key: 'hs_code',           type: 'single_line_text_field' },
  { key: 'origin',            type: 'single_line_text_field' },
];

/**
 * Build a Shopify metafield CSV column header.
 * @param {string} key
 * @param {string} type
 * @returns {string}
 */
export function metafieldHeader(key, type) {
  return `Metafield: specs.${key} [${type}]`;
}

// --- Query ---

const identifiers = SPEC_KEYS.map(
  (s) => `{ namespace: "specs", key: "${s.key}" }`,
).join(', ');

const query = `{
  products(first: 100) {
    nodes {
      handle
      metafields(identifiers: [${identifiers}]) { key value }
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

// --- CSV output ---

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const headers = ['Handle', ...SPEC_KEYS.map((s) => metafieldHeader(s.key, s.type))];
console.log(headers.map(csvEscape).join(','));

for (const p of products) {
  const mfMap = Object.fromEntries(
    (p.metafields ?? []).filter(Boolean).map((m) => [m.key, m.value]),
  );
  const row = [p.handle, ...SPEC_KEYS.map((s) => mfMap[s.key] ?? '')];
  console.log(row.map(csvEscape).join(','));
}

console.error(`\n[export-metafield-template] Exported ${products.length} products × ${SPEC_KEYS.length} spec fields.`);
