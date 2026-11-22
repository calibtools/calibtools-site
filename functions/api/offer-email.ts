/**
 * Cloudflare Pages Function: POST /api/offer-email
 *
 * Shopify "Draft order update" webhook (HMAC-verified). Sends the offer email for a custom quotation with
 * the quotation PDF attached. Shopify's own draft-order invoice email can only link to the PDF.
 *
 * A tag on the draft order starts it:
 * - offer-test                         → to our own mailbox only (repeat at most every two minutes)
 * - offer-send, offer-send-2, -3 …     → to the customer, with a copy to our mailbox; each tag sends once
 *
 * Everything in the email comes from the webhook body; the PDF is drawn from the offer behind the line's
 * `_quote_pdf` link, the same way /q/<id>/<key>.pdf draws it. A draft that cannot be sent (no custom
 * attribute, no PDF link, no customer email …) sends nothing to the customer and one note to our mailbox.
 *
 * Required bindings:
 * - SHOPIFY_WEBHOOK_SECRET: Shopify webhook signing secret (Settings → Notifications → Webhooks)
 * - RESEND_API_KEY
 * - QUOTES: KV namespace, remembers what was sent (keys hold the draft id and the tag, no address)
 * - ASSETS: site assets (PDF fonts)
 *
 * Shopify setup: Settings → Notifications → Webhooks → Create webhook
 *   Event: Draft order update · Format: JSON · URL: https://calib.tools/api/offer-email
 */
import { verifyShopifyHmac } from './rebuild';
import { offerDocument, type OfferDocEnv } from '../../src/lib/offerDoc';
import { bytesToBase64 } from '../../src/lib/base64';
import {
  offerEmailHtml, offerEmailSubject, offerEmailText, offerModel, offerPdfName, offerTriggers, REFUSAL_TEXT,
  type DraftWebhook, type OfferEmailModel,
} from '../../src/lib/offerEmail';

interface Env extends OfferDocEnv {
  SHOPIFY_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  QUOTES?: KVNamespace;
}

const FROM = 'Calib.Tools <quotes@calib.tools>';
const OWN_MAILBOX = 'hello@calib.tools';
const TEST_REPEAT_SECONDS = 120;
const NOTE_REPEAT_SECONDS = 3600;

interface Message {
  to: string;
  bcc?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: string }[];
}

async function send(apiKey: string, msg: Message): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to: [msg.to], ...(msg.bcc ? { bcc: [msg.bcc] } : {}), reply_to: OWN_MAILBOX, subject: msg.subject, text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
        ...(msg.attachments?.length ? { attachments: msg.attachments } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { SHOPIFY_WEBHOOK_SECRET: secret, RESEND_API_KEY: apiKey, QUOTES: kv } = ctx.env;
  if (!secret || !apiKey || !kv || !ctx.env.ASSETS) return new Response('Not configured', { status: 503 });

  const body = await ctx.request.arrayBuffer();
  const hmac = ctx.request.headers.get('X-Shopify-Hmac-Sha256') ?? '';
  if (!hmac || !(await verifyShopifyHmac(body, secret, hmac))) return new Response('Invalid HMAC', { status: 401 });

  let draft: DraftWebhook;
  try {
    draft = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return Response.json({ ok: true, action: 'ignored' });
  }
  const triggers = offerTriggers(draft.tags);
  if (!triggers.test && triggers.send.length === 0) return Response.json({ ok: true, action: 'ignored' });

  const draftId = String(draft.id ?? '');
  const draftName = String(draft.name ?? draftId);

  /** One note to our mailbox per draft and reason; the webhook is always answered 200 so Shopify keeps it. */
  const refuse = async (reason: keyof typeof REFUSAL_TEXT) => {
    const noteKey = `offer-note:${draftId}:${reason}`;
    if (!(await kv.get(noteKey))) {
      await kv.put(noteKey, '1', { expirationTtl: NOTE_REPEAT_SECONDS });
      await send(apiKey, {
        to: OWN_MAILBOX,
        subject: `Offer email for ${draftName} was not sent`,
        text: `The offer email for draft order ${draftName} was not sent: ${REFUSAL_TEXT[reason]}\n\nNothing went to the customer.`,
      });
    }
    console.log(`[offer-email] ${draftName}: refused, ${reason}`);
    return Response.json({ ok: true, action: 'refused', reason });
  };

  const built = offerModel(draft);
  if (!built.ok) return refuse(built.reason);
  const model: OfferEmailModel = built.model;

  let doc;
  try {
    doc = await offerDocument(ctx.env, new URL(ctx.request.url).origin, model.pdf.id, model.pdf.key);
  } catch {
    doc = { status: 'unavailable' as const };
  }
  if (doc.status === 'not-found') return refuse('pdf-missing');
  if (doc.status !== 'ok') return refuse('pdf-unavailable');

  const attachments = [{ filename: offerPdfName(doc.no), content: bytesToBase64(doc.pdf) }];
  const html = offerEmailHtml(model);
  const text = offerEmailText(model);

  let test: 'no' | 'sent' | 'recent' | 'send-failed' = 'no';
  if (triggers.test) {
    const testKey = `offer-test:${draftId}`;
    if (await kv.get(testKey)) test = 'recent';
    else {
      await kv.put(testKey, '1', { expirationTtl: TEST_REPEAT_SECONDS });
      test = (await send(apiKey, { to: OWN_MAILBOX, subject: offerEmailSubject(model, true), text, html, attachments })) ? 'sent' : 'send-failed';
    }
  }

  const customer: { tag: string; result: 'sent' | 'already-sent' | 'send-failed' }[] = [];
  for (const tag of triggers.send) {
    const sentKey = `offer-sent:${draftId}:${tag}`;
    if (await kv.get(sentKey)) { customer.push({ tag, result: 'already-sent' }); continue; }
    // Claimed before sending, so a second delivery of the same webhook does not send twice.
    await kv.put(sentKey, new Date().toISOString());
    const ok = await send(apiKey, { to: model.to, bcc: OWN_MAILBOX, subject: offerEmailSubject(model, false), text, html, attachments });
    if (ok) { customer.push({ tag, result: 'sent' }); continue; }
    await kv.delete(sentKey);
    customer.push({ tag, result: 'send-failed' });
    await send(apiKey, {
      to: OWN_MAILBOX,
      subject: `Offer email for ${draftName} was not sent`,
      text: `The offer email for draft order ${draftName} was not sent: ${REFUSAL_TEXT['send-failed']}\n\nNothing went to the customer.`,
    });
  }

  console.log(`[offer-email] ${draftName}: test ${test}; ${customer.map((c) => `${c.tag} ${c.result}`).join(', ') || 'no send tag'}`);
  return Response.json({ ok: true, test, customer });
};
