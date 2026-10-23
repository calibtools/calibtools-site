/**
 * Pre-build guard: verifies PUBLIC_SHOPIFY_STOREFRONT_TOKEN is a valid
 * public Storefront API token (32-char hex, no prefix) and that a basic
 * query succeeds. Exits 1 on failure so the build aborts loudly.
 *
 * Bypass with SKIP_STOREFRONT_CHECK=1 (for CI without secrets).
 */

import { readFileSync } from 'node:fs';

if (process.env.SKIP_STOREFRONT_CHECK === '1') {
  console.log('[verify-storefront] Skipped (SKIP_STOREFRONT_CHECK=1)');
  process.exit(0);
}

// Load .env if present (simple key=value, no interpolation)
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
} catch {
  // No .env file — rely on environment variables
}

const domain = process.env.PUBLIC_SHOPIFY_DOMAIN;
const token = process.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

if (!domain) {
  console.error('\n  PUBLIC_SHOPIFY_DOMAIN is not set.\n  Set it in .env or as an environment variable.\n');
  process.exit(1);
}

if (!token) {
  console.error('\n  PUBLIC_SHOPIFY_STOREFRONT_TOKEN is not set.\n  Set it in .env or as an environment variable.\n');
  process.exit(1);
}

if (!/^[0-9a-f]{32}$/.test(token)) {
  console.error(
    `\n  PUBLIC_SHOPIFY_STOREFRONT_TOKEN is not a valid public token.` +
    `\n  Expected: 32-character hex string (no prefix).` +
    `\n  Got:      ${token.slice(0, 10)}...` +
    `\n  If it starts with shpat_ or shpss_, you have a PRIVATE token — use the Headless channel public token instead.\n`
  );
  process.exit(1);
}

// Test the token with a minimal query
const res = await fetch(`https://${domain}/api/2025-07/graphql.json`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': token,
  },
  body: JSON.stringify({ query: '{ shop { name } }' }),
});

if (!res.ok) {
  console.error(`\n  Storefront API returned ${res.status} ${res.statusText}.`);
  if (res.status === 401) {
    console.error('  The token was rejected. Make sure PUBLIC_SHOPIFY_STOREFRONT_TOKEN is the Headless channel PUBLIC access token.');
  }
  console.error('');
  process.exit(1);
}

const json = await res.json();
if (json.errors?.length) {
  console.error(`\n  Storefront API returned errors: ${json.errors[0].message}\n`);
  process.exit(1);
}

console.log(`[verify-storefront] OK — shop: ${json.data.shop.name}, token: ${token.slice(0, 6)}...`);
