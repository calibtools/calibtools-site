/**
 * Cloudflare Pages Function: POST /api/quote
 *
 * Forwards quote requests to hello@calib.tools via Resend.
 * Falls back to storing in KV namespace QUOTES so no request is lost.
 *
 * Setup required in Cloudflare Pages:
 * 1. Environment variable: RESEND_API_KEY (encrypted secret)
 * 2. (Optional) KV namespace: create "QUOTES" and bind as QUOTES in Pages settings
 *
 * DNS records for calib.tools sending domain (Resend will provide exact values):
 * - DKIM: TXT resend._domainkey.calib.tools → (value from Resend dashboard)
 * - SPF:  TXT calib.tools → v=spf1 include:send.resend.com ~all
 * - (Optional) DMARC: TXT _dmarc.calib.tools → v=DMARC1; p=none; rua=mailto:hello@calib.tools
 */

import { checkWorkEmail, hasMailServer, WORK_EMAIL_MESSAGE } from '../../src/lib/workEmail';
import { verifyTurnstile, TURNSTILE_FIELD } from '../../src/lib/turnstile';

interface Env {
  RESEND_API_KEY?: string;
  QUOTES?: KVNamespace;
  /** Cloudflare Turnstile secret; human check is enforced once this is set. */
  TURNSTILE_SECRET_KEY?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = 500;
const MAX_PATTERN_LEN = 1500;

/** Generator link sent with a quote request: a calib.tools generator path, nothing else. */
export function cleanPatternPath(raw: string): string {
  const v = raw.trim();
  if (!v || v.length > MAX_PATTERN_LEN) return '';
  return /^\/tools\/generator(\/[a-z-]+)?\/?\?[A-Za-z0-9_.~%=&+-]*$/.test(v) ? v : '';
}
const RATE_LIMIT = 10; // per hour per IP

type FieldError = { field: string; message: string };

function validate(fields: Record<string, string>): FieldError | null {
  if (!fields.name) return { field: 'name', message: 'Please enter your name.' };
  if (!fields.company) return { field: 'company', message: 'Please enter your company or institution.' };
  if (!fields.email) return { field: 'email', message: 'Please enter your work email.' };
  if (!EMAIL_RE.test(fields.email)) return { field: 'email', message: WORK_EMAIL_MESSAGE.invalid };
  const work = checkWorkEmail(fields.email);
  if (!work.ok) return { field: 'email', message: WORK_EMAIL_MESSAGE[work.reason] };
  for (const [key, val] of Object.entries(fields)) {
    if (val.length > MAX_LEN) return { field: key, message: `${key} exceeds ${MAX_LEN} characters.` };
  }
  return null;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const formData = await ctx.request.formData();

  // Honeypot check
  if (formData.get('website')) {
    return Response.redirect(new URL('/quote/?sent=1', ctx.request.url).toString(), 303);
  }

  const fields = {
    name: String(formData.get('name') ?? '').trim(),
    company: String(formData.get('company') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    product: String(formData.get('product') ?? '').trim(),
    message: String(formData.get('message') ?? '').trim(),
    source_page: String(formData.get('source_page') ?? '').trim().slice(0, 200),
  };
  const patternPath = cleanPatternPath(String(formData.get('pattern') ?? ''));

  const wantsJson = (ctx.request.headers.get('Accept') ?? '').includes('application/json');
  const fail = (status: number, field: string, message: string) =>
    wantsJson
      ? new Response(JSON.stringify({ ok: false, field, message }), { status, headers: { 'Content-Type': 'application/json' } })
      : new Response(message, { status });

  const error = validate(fields);
  if (error) return fail(400, error.field, error.message);

  // Human check (Cloudflare Turnstile)
  const ipForCheck = ctx.request.headers.get('CF-Connecting-IP') ?? '';
  const human = await verifyTurnstile(String(formData.get(TURNSTILE_FIELD) ?? ''), ctx.env.TURNSTILE_SECRET_KEY, ipForCheck);
  if (!human.ok) return fail(403, 'turnstile', human.message);

  // The email domain has to accept mail
  if (!(await hasMailServer(fields.email.split('@')[1]))) return fail(400, 'email', WORK_EMAIL_MESSAGE.nomx);

  // Rate limit by IP using KV (skip if KV not bound)
  const ip = ctx.request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (ctx.env.QUOTES) {
    const rateKey = `rate-${ip}-${Math.floor(Date.now() / 3_600_000)}`;
    const count = Number(await ctx.env.QUOTES.get(rateKey) ?? '0');
    if (count >= RATE_LIMIT) {
      return fail(429, 'form', 'Too many requests. Please try again later.');
    }
    await ctx.env.QUOTES.put(rateKey, String(count + 1), { expirationTtl: 3600 });
  }

  const { name, company, email, product, message, source_page } = fields;
  const patternUrl = patternPath ? `https://calib.tools${patternPath}` : '';

  const subject = `Quote request — ${company || '(no company)'} — ${product || '(no product)'}`;
  const body = [
    `Name: ${name}`,
    `Company: ${company}`,
    `Email: ${email}`,
    `Product: ${product}`,
    `Message:\n${message}`,
    ...(patternUrl ? ['', `Pattern (opens the exact pattern in the generator):\n${patternUrl}`] : []),
    ...(source_page ? ['', `Sent from: ${source_page}`] : []),
  ].join('\n');

  let emailSent = false;
  let kvSaved = false;

  // Try Resend
  if (ctx.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ctx.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Calib.Tools <quotes@calib.tools>',
          to: ['hello@calib.tools'],
          reply_to: email,
          subject,
          text: body,
        }),
      });
      emailSent = res.ok;
    } catch {
      // Resend unavailable, fall through to KV
    }
  }

  // KV fallback: always write so no request is lost
  if (ctx.env.QUOTES) {
    try {
      const key = `quote-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      await ctx.env.QUOTES.put(
        key,
        JSON.stringify({ name, company, email, product, message, pattern: patternUrl, source_page, ts: new Date().toISOString() }),
      );
      kvSaved = true;
    } catch {
      // KV write failed
    }
  }

  if (!emailSent && !kvSaved) {
    return new Response('Could not send quote request. Please email hello@calib.tools directly.', { status: 500 });
  }

  // Return JSON for fetch callers, redirect for form submissions
  const accept = ctx.request.headers.get('Accept') ?? '';
  if (accept.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return Response.redirect(new URL('/quote/?sent=1', ctx.request.url).toString(), 303);
};
