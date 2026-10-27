#!/usr/bin/env node
/**
 * Daily script: scan REVIEWS KV for due invite tokens, send via Resend.
 *
 * Usage:
 *   node scripts/send-review-invites.mjs            — live run
 *   node scripts/send-review-invites.mjs --dry-run   — print what would send, touch nothing
 *
 * Env vars (required unless --dry-run with --fixture):
 *   CF_ACCOUNT_ID, CF_KV_REVIEWS_NAMESPACE_ID, CF_API_TOKEN — Cloudflare KV access
 *   RESEND_API_KEY — Resend sending
 *
 * Idempotency: an invite whose `sent` flag is already true is never re-sent,
 * even if the script runs again. The flag is written back to KV atomically
 * after a successful Resend call.
 *
 * Cloudflare Pages Functions do not support scheduled triggers.
 * Schedule this script externally (e.g. GitHub Actions cron, crontab).
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FIXTURE_PATH = process.argv.find((a) => a.startsWith('--fixture='))?.split('=')[1];

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_KV_NS = process.env.CF_KV_REVIEWS_NAMESPACE_ID;
const CF_TOKEN = process.env.CF_API_TOKEN;
const RESEND_KEY = process.env.RESEND_API_KEY;

if (!DRY_RUN && (!CF_ACCOUNT_ID || !CF_KV_NS || !CF_TOKEN || !RESEND_KEY)) {
  console.error('Missing required env vars: CF_ACCOUNT_ID, CF_KV_REVIEWS_NAMESPACE_ID, CF_API_TOKEN, RESEND_API_KEY');
  process.exit(1);
}

const KV_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NS}`;
const headers = { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' };

async function listKeys(prefix) {
  const res = await fetch(`${KV_BASE}/keys?prefix=${prefix}`, { headers });
  const data = await res.json();
  return data.result?.map((k) => k.name) ?? [];
}

async function getKey(key) {
  const res = await fetch(`${KV_BASE}/values/${encodeURIComponent(key)}`, { headers });
  return res.ok ? res.json() : null;
}

async function putKey(key, value) {
  await fetch(`${KV_BASE}/values/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(value),
  });
}

async function sendEmail(to, token, productTitle) {
  const link = `https://calib.tools/review/${token}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Calib.Tools <reviews@calib.tools>',
      to: [to],
      subject: `How was your ${productTitle}?`,
      text: [
        `Hi,`,
        ``,
        `Your ${productTitle} was delivered about two weeks ago.`,
        `If you have a moment, we'd appreciate a short review:`,
        ``,
        link,
        ``,
        `The link is valid for 30 days and can be used once.`,
        ``,
        `Thanks,`,
        `Calib.Tools`,
      ].join('\n'),
    }),
  });
  return res.ok;
}

async function loadFixture(path) {
  const { readFileSync } = await import('node:fs');
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  // data is { "invite:TOKEN": { ...invite } }
  return data;
}

async function main() {
  let inviteEntries; // Array of [key, inviteObject]

  if (FIXTURE_PATH) {
    const fixture = await loadFixture(FIXTURE_PATH);
    inviteEntries = Object.entries(fixture);
  } else {
    const keys = await listKeys('invite:');
    inviteEntries = [];
    for (const key of keys) {
      const invite = await getKey(key);
      if (invite) inviteEntries.push([key, invite]);
    }
  }

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const [key, invite] of inviteEntries) {
    if (!invite || invite.sent || invite.used) { skipped++; continue; }
    if (new Date(invite.sendAt) > now) { skipped++; continue; }
    if (new Date(invite.expiresAt) < now) { skipped++; continue; }

    if (DRY_RUN) {
      console.log(`[dry-run] Would send: ${invite.email} for ${invite.handle}`);
      sent++;
      continue;
    }

    const ok = await sendEmail(invite.email, invite.token, invite.productTitle || invite.handle);
    if (ok) {
      invite.sent = true;
      await putKey(key, invite);
      sent++;
      console.log(`Sent: ${invite.email} for ${invite.handle}`);
    } else {
      console.error(`Failed: ${invite.email}`);
      errors++;
    }
  }

  const prefix = DRY_RUN ? '[dry-run] ' : '';
  console.log(`${prefix}Done. Sent: ${sent}, Skipped: ${skipped}, Errors: ${errors}`);

  if (errors > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
