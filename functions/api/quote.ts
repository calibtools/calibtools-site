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

interface Env {
  RESEND_API_KEY?: string;
  QUOTES?: KVNamespace;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = 500;
const RATE_LIMIT = 10; // per hour per IP

function validate(fields: Record<string, string>): string | null {
  if (!fields.name) return 'Name is required.';
  if (!fields.email) return 'Email is required.';
  if (!EMAIL_RE.test(fields.email)) return 'Invalid email address.';
  for (const [key, val] of Object.entries(fields)) {
    if (val.length > MAX_LEN) return `${key} exceeds ${MAX_LEN} characters.`;
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
  };

  const error = validate(fields);
  if (error) {
    return new Response(error, { status: 400 });
  }

  // Rate limit by IP using KV (skip if KV not bound)
  const ip = ctx.request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (ctx.env.QUOTES) {
    const rateKey = `rate-${ip}-${Math.floor(Date.now() / 3_600_000)}`;
    const count = Number(await ctx.env.QUOTES.get(rateKey) ?? '0');
    if (count >= RATE_LIMIT) {
      return new Response('Too many requests. Please try again later.', { status: 429 });
    }
    await ctx.env.QUOTES.put(rateKey, String(count + 1), { expirationTtl: 3600 });
  }

  const { name, company, email, product, message } = fields;

  const subject = `Quote request — ${company || '(no company)'} — ${product || '(no product)'}`;
  const body = [
    `Name: ${name}`,
    `Company: ${company}`,
    `Email: ${email}`,
    `Product: ${product}`,
    `Message:\n${message}`,
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
        JSON.stringify({ name, company, email, product, message, ts: new Date().toISOString() }),
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
