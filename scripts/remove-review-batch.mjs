#!/usr/bin/env node
/**
 * Remove all reviews from an import batch.
 * Usage: node scripts/remove-review-batch.mjs --batch <name>
 *
 * Each review is kept in KV with status "removed:batch-retracted" (same
 * visible-note mechanism as remove-review.mjs).
 *
 * Env: CF_ACCOUNT_ID, CF_KV_REVIEWS_NAMESPACE_ID, CF_API_TOKEN, CF_DEPLOY_HOOK
 */

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const BATCH = getArg('--batch');
if (!BATCH) {
  console.error('Usage: node scripts/remove-review-batch.mjs --batch <name>');
  process.exit(1);
}

// Load .env
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

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_KV_NS = process.env.CF_KV_REVIEWS_NAMESPACE_ID;
const CF_TOKEN = process.env.CF_API_TOKEN;
const DEPLOY_HOOK = process.env.CF_DEPLOY_HOOK;

if (!CF_ACCOUNT_ID || !CF_KV_NS || !CF_TOKEN) {
  console.error('Missing env vars: CF_ACCOUNT_ID, CF_KV_REVIEWS_NAMESPACE_ID, CF_API_TOKEN');
  process.exit(1);
}

const KV_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NS}`;
const headers = { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' };

async function main() {
  // List all review keys
  const listRes = await fetch(`${KV_BASE}/keys?prefix=review:`, { headers });
  if (!listRes.ok) { console.error('Failed to list keys'); process.exit(1); }

  const listData = await listRes.json();
  const keys = (listData.result || []).map((k) => k.name);

  let removed = 0;
  let skipped = 0;

  for (const key of keys) {
    const valRes = await fetch(`${KV_BASE}/values/${encodeURIComponent(key)}`, { headers });
    if (!valRes.ok) { skipped++; continue; }

    const review = await valRes.json();
    if (review.importBatch !== BATCH) { skipped++; continue; }

    review.status = 'removed:batch-retracted';
    await fetch(`${KV_BASE}/values/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(review),
    });
    console.log(`  Removed: ${key} (${review.handle} by ${review.author?.initials})`);
    removed++;
  }

  console.log(`\nBatch "${BATCH}": ${removed} review(s) removed, ${skipped} skipped.`);

  if (removed > 0 && DEPLOY_HOOK) {
    await fetch(DEPLOY_HOOK, { method: 'POST' });
    console.log('Deploy triggered.');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
