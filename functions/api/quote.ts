/**
 * Cloudflare Pages Function: POST /api/quote
 *
 * Gives each request a reference number (Q-YYYYMMDD-XXXX), stores it as JSON in KV
 * (QUOTES, key quote:<id>), emails hello@calib.tools with the number in the subject and
 * sends the customer a confirmation that doubles as an email-address check
 * (/api/quote-confirm). KV is written first so no request is lost if email fails.
 *
 * Setup required in Cloudflare Pages:
 * 1. Environment variable: RESEND_API_KEY (encrypted secret)
 * 2. KV namespace QUOTES bound as QUOTES
 * 3. QUOTE_HMAC_SECRET (secret; falls back to REVIEW_HMAC_SECRET) for the confirmation link
 *
 * DNS records for calib.tools sending domain (Resend will provide exact values):
 * - DKIM: TXT resend._domainkey.calib.tools → (value from Resend dashboard)
 * - SPF:  TXT calib.tools → v=spf1 include:send.resend.com ~all
 * - (Optional) DMARC: TXT _dmarc.calib.tools → v=DMARC1; p=none; rua=mailto:hello@calib.tools
 */

import { checkWorkEmail, hasMailServer, WORK_EMAIL_MESSAGE } from '../../src/lib/workEmail';
import { verifyTurnstile, TURNSTILE_FIELD } from '../../src/lib/turnstile';
import {
  confirmToken, confirmUrl, customerBody, customerSubject, internalBody, internalSubject,
  isCountry, isMaterial, kvKey, newQuoteId, parseQuantity, type QuoteRecord,
} from '../../src/lib/quote';

interface Env {
  RESEND_API_KEY?: string;
  QUOTES?: KVNamespace;
  /** Cloudflare Turnstile secret; human check is enforced once this is set. */
  TURNSTILE_SECRET_KEY?: string;
  /** Signs the email-confirmation link. */
  QUOTE_HMAC_SECRET?: string;
  REVIEW_HMAC_SECRET?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = 500;
const MAX_MESSAGE_LEN = 2000;
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
  if (!isMaterial(fields.material)) return { field: 'material', message: 'Please choose a material, or "Not sure yet".' };
  if (parseQuantity(fields.quantity) === null) return { field: 'quantity', message: 'Please enter a quantity from 1 to 9999.' };
  if (!isCountry(fields.country)) return { field: 'country', message: 'Please choose the delivery country.' };
  for (const [key, val] of Object.entries(fields)) {
    const max = key === 'message' ? MAX_MESSAGE_LEN : MAX_LEN;
    if (val.length > max) return { field: key, message: `${key} exceeds ${max} characters.` };
  }
  return null;
}

async function sendEmail(apiKey: string, msg: { to: string; reply_to: string; subject: string; text: string }): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Calib.Tools <quotes@calib.tools>', to: [msg.to], reply_to: msg.reply_to, subject: msg.subject, text: msg.text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const formData = await ctx.request.formData();

  // Honeypot check
  if (formData.get('website')) {
    return Response.redirect(new URL('/quote/sent/', ctx.request.url).toString(), 303);
  }

  const get = (k: string) => String(formData.get(k) ?? '').trim();
  const fields = {
    name: get('name'),
    company: get('company'),
    email: get('email'),
    product: get('product'),
    material: get('material'),
    quantity: get('quantity'),
    country: get('country').toUpperCase(),
    message: get('message'),
    source_page: get('source_page').slice(0, 200),
  };
  const patternPath = cleanPatternPath(get('pattern'));
  const boardsRaw = Number(get('boards') || '1');
  const boards = Number.isInteger(boardsRaw) && boardsRaw >= 1 && boardsRaw < 100 ? boardsRaw : 1;

  const wantsJson = (ctx.request.headers.get('Accept') ?? '').includes('application/json');
  const fail = (status: number, field: string, message: string) =>
    wantsJson
      ? new Response(JSON.stringify({ ok: false, field, message }), { status, headers: { 'Content-Type': 'application/json' } })
      : new Response(message, { status });

  const error = validate(fields);
  if (error) return fail(400, error.field, error.message);

  // Human check (Cloudflare Turnstile)
  const ip = ctx.request.headers.get('CF-Connecting-IP') ?? '';
  const human = await verifyTurnstile(get(TURNSTILE_FIELD), ctx.env.TURNSTILE_SECRET_KEY, ip);
  if (!human.ok) return fail(403, 'turnstile', human.message);

  // The email domain has to accept mail
  if (!(await hasMailServer(fields.email.split('@')[1]))) return fail(400, 'email', WORK_EMAIL_MESSAGE.nomx);

  // Rate limit by IP using KV (skip if KV not bound)
  if (ctx.env.QUOTES) {
    const rateKey = `rate-${ip || 'unknown'}-${Math.floor(Date.now() / 3_600_000)}`;
    const count = Number((await ctx.env.QUOTES.get(rateKey)) ?? '0');
    if (count >= RATE_LIMIT) return fail(429, 'form', 'Too many requests. Please try again later.');
    await ctx.env.QUOTES.put(rateKey, String(count + 1), { expirationTtl: 3600 });
  }

  // Reference number; regenerate on the (unlikely) collision
  let id = newQuoteId();
  if (ctx.env.QUOTES && (await ctx.env.QUOTES.get(kvKey(id)))) id = newQuoteId();

  const record: QuoteRecord = {
    id,
    ts: new Date().toISOString(),
    name: fields.name,
    company: fields.company,
    email: fields.email,
    product: fields.product,
    material: isMaterial(fields.material) ? fields.material : '',
    quantity: parseQuantity(fields.quantity),
    boards,
    country: fields.country,
    message: fields.message,
    pattern: patternPath ? `https://calib.tools${patternPath}` : '',
    source_page: fields.source_page,
    emailVerified: false,
    customerEmailSent: false,
  };

  // KV first, so no request is lost
  let kvSaved = false;
  const save = async () => {
    if (!ctx.env.QUOTES) return false;
    try { await ctx.env.QUOTES.put(kvKey(id), JSON.stringify(record)); return true; } catch { return false; }
  };
  kvSaved = await save();

  const secret = ctx.env.QUOTE_HMAC_SECRET || ctx.env.REVIEW_HMAC_SECRET || '';
  const link = secret ? confirmUrl(new URL(ctx.request.url).origin, id, await confirmToken(secret, id)) : '';

  let internalSent = false;
  if (ctx.env.RESEND_API_KEY) {
    internalSent = await sendEmail(ctx.env.RESEND_API_KEY, {
      to: 'hello@calib.tools',
      reply_to: record.email,
      subject: internalSubject(record),
      text: internalBody(record, link ? 'not yet confirmed; confirmation link sent' : 'no confirmation link: QUOTE_HMAC_SECRET not set'),
    });
    record.customerEmailSent = await sendEmail(ctx.env.RESEND_API_KEY, {
      to: record.email,
      reply_to: 'hello@calib.tools',
      subject: customerSubject(record),
      text: customerBody(record, link),
    });
    if (record.customerEmailSent && kvSaved) await save();
  }

  if (!internalSent && !kvSaved) {
    return fail(500, 'form', 'Could not send quote request. Please email hello@calib.tools directly.');
  }

  if (wantsJson) {
    return new Response(JSON.stringify({ ok: true, id, customerEmailSent: record.customerEmailSent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return Response.redirect(new URL(`/quote/sent/?q=${id}`, ctx.request.url).toString(), 303);
};
