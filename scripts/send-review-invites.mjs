#!/usr/bin/env node
/**
 * Daily script: scan REVIEWS KV for due invite tokens, send via Resend.
 *
 * Usage: node scripts/send-review-invites.mjs
 *
 * Env vars:
 *   CF_ACCOUNT_ID, CF_KV_REVIEWS_NAMESPACE_ID, CF_API_TOKEN — Cloudflare KV access
 *   RESEND_API_KEY — Resend sending
 *
 * Cloudflare Pages Functions do not support scheduled triggers.
 * Schedule this script externally (e.g. GitHub Actions cron, crontab).
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_KV_NS = process.env.CF_KV_REVIEWS_NAMESPACE_ID;
const CF_TOKEN = process.env.CF_API_TOKEN;
const RESEND_KEY = process.env.RESEND_API_KEY;

if (!CF_ACCOUNT_ID || !CF_KV_NS || !CF_TOKEN || !RESEND_KEY) {
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

async function main() {
  const keys = await listKeys('invite:');
  const now = new Date();
  let sent = 0;
  let skipped = 0;

  for (const key of keys) {
    const invite = await getKey(key);
    if (!invite || invite.sent || invite.used) { skipped++; continue; }
    if (new Date(invite.sendAt) > now) { skipped++; continue; }
    if (new Date(invite.expiresAt) < now) { skipped++; continue; }

    const ok = await sendEmail(invite.email, invite.token, invite.productTitle || invite.handle);
    if (ok) {
      invite.sent = true;
      await putKey(key, invite);
      sent++;
      console.log(`Sent: ${invite.email} for ${invite.handle}`);
    } else {
      console.error(`Failed: ${invite.email}`);
    }
  }

  console.log(`Done. Sent: ${sent}, Skipped: ${skipped}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
