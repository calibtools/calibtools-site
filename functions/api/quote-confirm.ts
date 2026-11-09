/**
 * Cloudflare Pages Function: GET /api/quote-confirm?q=<id>&t=<token>
 *
 * The link in the customer's confirmation email. A valid token marks the stored
 * quote as email-verified, tells hello@ once, and lands on /quote/confirmed/.
 */
import { checkConfirmToken, isQuoteId, kvKey, type QuoteRecord } from '../../src/lib/quote';

interface Env {
  QUOTES?: KVNamespace;
  RESEND_API_KEY?: string;
  QUOTE_HMAC_SECRET?: string;
  REVIEW_HMAC_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get('q') ?? '';
  const token = url.searchParams.get('t') ?? '';
  const land = (status: 'ok' | 'invalid') =>
    Response.redirect(new URL(`/quote/confirmed/?status=${status}${isQuoteId(id) ? `&q=${id}` : ''}`, url).toString(), 303);

  const secret = ctx.env.QUOTE_HMAC_SECRET || ctx.env.REVIEW_HMAC_SECRET || '';
  if (!secret || !(await checkConfirmToken(secret, id, token))) return land('invalid');
  if (!ctx.env.QUOTES) return land('ok');

  const raw = await ctx.env.QUOTES.get(kvKey(id));
  if (!raw) return land('ok');
  const record = JSON.parse(raw) as QuoteRecord;
  if (record.emailVerified) return land('ok');

  record.emailVerified = true;
  record.verifiedAt = new Date().toISOString();
  await ctx.env.QUOTES.put(kvKey(id), JSON.stringify(record));

  if (ctx.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Calib.Tools <quotes@calib.tools>',
          to: ['hello@calib.tools'],
          reply_to: record.email,
          subject: `${id} · email confirmed`,
          text: `${record.email} (${record.company}) confirmed the email address for quote ${id} at ${record.verifiedAt}.`,
        }),
      });
    } catch {
      // the record is already updated; the email is only a notice
    }
  }
  return land('ok');
};
