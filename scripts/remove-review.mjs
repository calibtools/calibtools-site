#!/usr/bin/env node
/**
 * Remove a review (spam, abuse, or personal data).
 * Usage: node scripts/remove-review.mjs <review-id> <spam|abuse|personal-data>
 *
 * The review is kept in KV with status "removed:<reason>".
 * The product page shows a "Removed: <reason>" row in place of the review.
 *
 * Env: CF_ACCOUNT_ID, CF_KV_REVIEWS_NAMESPACE_ID, CF_API_TOKEN, CF_DEPLOY_HOOK
 */

const VALID_REASONS = ['spam', 'abuse', 'personal-data'];
const [,, reviewId, reason] = process.argv;

if (!reviewId || !reason || !VALID_REASONS.includes(reason)) {
  console.error(`Usage: node scripts/remove-review.mjs <id> <${VALID_REASONS.join('|')}>`);
  process.exit(1);
}

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_KV_NS = process.env.CF_KV_REVIEWS_NAMESPACE_ID;
const CF_TOKEN = process.env.CF_API_TOKEN;
const DEPLOY_HOOK = process.env.CF_DEPLOY_HOOK;

if (!CF_ACCOUNT_ID || !CF_KV_NS || !CF_TOKEN) {
  console.error('Missing env vars');
  process.exit(1);
}

const KV_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NS}`;
const headers = { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' };

async function main() {
  const key = `review:${reviewId}`;
  const res = await fetch(`${KV_BASE}/values/${encodeURIComponent(key)}`, { headers });
  if (!res.ok) { console.error('Review not found'); process.exit(1); }

  const review = await res.json();
  review.status = `removed:${reason}`;

  await fetch(`${KV_BASE}/values/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(review),
  });

  console.log(`Review ${reviewId} marked as removed:${reason}`);

  if (DEPLOY_HOOK) {
    await fetch(DEPLOY_HOOK, { method: 'POST' });
    console.log('Deploy triggered');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
