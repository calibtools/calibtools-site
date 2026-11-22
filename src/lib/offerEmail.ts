/**
 * The offer email for a custom quotation: built from a Shopify draft order and sent by the site, so the
 * quotation PDF can travel as an attachment (Shopify notifications can't attach files).
 *
 * Layout follows DESIGN.md for email: paper ground, framed wordmark on its own white row, the quotation
 * number below it, red square button, mono labels. Order terms and the sign-off line come from the shared
 * constants, never retyped here.
 */
import { CUSTOM_ORDER_FINAL, PAYMENT_ACCEPTS_QUOTATION } from './orderTerms';
import { SIGN_OFF_LINE } from './brand';
import { isOfferId, isOfferKey } from './offerCrypto';

/** The fields of Shopify's draft-order webhook body that the email uses. */
export interface DraftWebhook {
  id?: number | string;
  name?: string;
  email?: string | null;
  customer?: { email?: string | null } | null;
  status?: string;
  tags?: string;
  note?: string | null;
  currency?: string;
  invoice_url?: string;
  subtotal_price?: string;
  total_tax?: string;
  total_price?: string;
  shipping_line?: { title?: string; price?: string } | null;
  line_items?: {
    title?: string;
    quantity?: number;
    price?: string;
    applied_discount?: { amount?: string } | null;
    properties?: { name?: string; value?: unknown }[] | null;
  }[];
}

export interface OfferEmailModel {
  draftName: string;
  quoteNo: string;
  to: string;
  invoiceUrl: string;
  pdf: { id: string; key: string };
  items: { title: string; quantity: number; price: string; specs: { name: string; value: string }[] }[];
  note: string;
  subtotal: string;
  shipping: string;
  /** Empty when there is no tax on the draft. */
  tax: string;
  total: string;
}

export type OfferRefusal = 'completed' | 'not-custom' | 'no-pdf' | 'no-recipient' | 'no-order-link';

/** Tag that sends the email to our own mailbox only. */
export const OFFER_TEST_TAG = 'offer-test';
/** Tags that send it to the customer: offer-send, then offer-send-2, offer-send-3 … for a deliberate resend. */
const SEND_TAG = /^offer-send(-[0-9]{1,3})?$/;

export function offerTriggers(tags: string | undefined | null): { test: boolean; send: string[] } {
  const list = String(tags ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  return { test: list.includes(OFFER_TEST_TAG), send: [...new Set(list.filter((t) => SEND_TAG.test(t)))].sort() };
}

export function formatMoney(amount: string | number | undefined, currency: string | undefined): string {
  const n = Number(amount ?? 0);
  const v = (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return !currency || currency === 'USD' ? `$${v}` : `${v} ${currency}`;
}

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const PDF_LINK = /^https:\/\/calib\.tools\/q\/([a-z0-9]+)\/([A-Za-z0-9_-]+)\.pdf$/;

export function offerModel(d: DraftWebhook): { ok: true; model: OfferEmailModel } | { ok: false; reason: OfferRefusal } {
  if (d.status === 'completed') return { ok: false, reason: 'completed' };
  const currency = d.currency || 'USD';
  const draftName = String(d.name ?? '');
  let quoteNo = '';
  let pdfLink = '';
  let custom = false;
  const items = (d.line_items ?? []).map((line) => {
    const specs: { name: string; value: string }[] = [];
    for (const p of line.properties ?? []) {
      const name = String(p?.name ?? '');
      const value = String(p?.value ?? '').trim();
      if (!name || !value) continue;
      if (name === '_quote_pdf') { pdfLink = value; continue; }
      if (name.startsWith('_')) continue;
      custom = true;
      if (name === 'Quotation') { quoteNo = value; continue; }
      specs.push({ name, value });
    }
    const quantity = Number(line.quantity ?? 1) || 1;
    const linePrice = Number(line.price ?? 0) * quantity - Number(line.applied_discount?.amount ?? 0);
    return { title: String(line.title ?? ''), quantity, price: formatMoney(linePrice, currency), specs };
  });
  if (!custom) return { ok: false, reason: 'not-custom' };

  const m = PDF_LINK.exec(pdfLink);
  if (!m || !isOfferId(m[1]) || !isOfferKey(m[2])) return { ok: false, reason: 'no-pdf' };

  const to = String(d.email || d.customer?.email || '').trim();
  if (!EMAIL_RE.test(to)) return { ok: false, reason: 'no-recipient' };

  const invoiceUrl = String(d.invoice_url ?? '');
  if (!/^https:\/\/[a-z0-9.-]+\/[^\s"<>]*$/i.test(invoiceUrl)) return { ok: false, reason: 'no-order-link' };

  const tax = Number(d.total_tax ?? 0);
  return {
    ok: true,
    model: {
      draftName,
      quoteNo: quoteNo || draftName,
      to,
      invoiceUrl,
      pdf: { id: m[1], key: m[2] },
      items,
      note: String(d.note ?? '').trim(),
      subtotal: formatMoney(d.subtotal_price, currency),
      shipping: formatMoney(d.shipping_line?.price, currency),
      tax: tax > 0 ? formatMoney(tax, currency) : '',
      total: `${formatMoney(d.total_price, currency)}${currency === 'USD' ? ' USD' : ''}`,
    },
  };
}

export function offerEmailSubject(m: OfferEmailModel, test: boolean): string {
  return `${test ? 'TEST: ' : ''}Your quotation ${m.quoteNo} from Calib.Tools`;
}

/** File name of the attachment. */
export function offerPdfName(quoteNo: string): string {
  return `Quotation-${quoteNo.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
}

const INTRO =
  'The quotation is attached to this email as a PDF and lists what we agreed. Check the specification, then confirm the order with the button. Production starts once the order is confirmed.';
const DUTIES = 'Import duties and taxes of your country are not included unless the quotation says so.';
const QUESTIONS = ['Questions or changes? Reply to this email or write to ', 'hello@calib.tools', '. We answer within one business day.'] as const;

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export function offerEmailHtml(m: OfferEmailModel): string {
  const rows = m.items.map((it) => `
    <tr>
      <td valign="top" style="padding:14px 10px 14px 0;border-bottom:1px solid #EAE8E2;font-family:${FONT};color:#141414;">
        <div style="font-size:15px;line-height:21px;font-weight:600;">${esc(it.title)}</div>
        <div style="font-family:${MONO};font-size:12px;line-height:18px;color:#6B6A66;">Quantity ${it.quantity}</div>${it.specs.map((s) => `
        <div style="font-size:13px;line-height:19px;color:#4A4A47;"><span style="color:#6B6A66;">${esc(s.name)}:</span> ${esc(s.value)}</div>`).join('')}
      </td>
      <td align="right" valign="top" style="padding:14px 0 14px 0;border-bottom:1px solid #EAE8E2;font-family:${MONO};font-size:14px;line-height:21px;color:#141414;white-space:nowrap;">${esc(it.price)}</td>
    </tr>`).join('');

  const note = m.note ? `
<tr><td style="padding:16px 28px 0 28px;font-family:${FONT};">
  <div style="padding:12px 14px;background:#F4F3EF;font-size:13px;line-height:20px;color:#4A4A47;"><span style="font-family:${MONO};font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#6B6A66;">Specification and notes</span><br>${esc(m.note).replace(/\r?\n/g, '<br>')}</div>
</td></tr>` : '';

  const tax = m.tax ? `
    <tr><td style="color:#6B6A66;">Taxes</td><td align="right">${esc(m.tax)}</td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width">
<title>Your custom offer ${esc(m.quoteNo)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F3EF;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F3EF;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #A8A59C;">

<tr><td align="left" style="padding:20px 28px 16px 28px;background:#FFFFFF;background-image:linear-gradient(#FFFFFF,#FFFFFF);"><a href="https://calib.tools" style="text-decoration:none;"><img src="https://calib.tools/brand/email/wordmark-framed-light.png" width="160" alt="Calib.Tools" style="display:block;border:0;width:160px;height:auto;"></a></td></tr>
<tr><td align="left" style="padding:0 28px 14px 28px;border-bottom:1px solid #141414;font-family:${MONO};font-size:11px;line-height:16px;letter-spacing:0.04em;text-transform:uppercase;color:#6B6A66;">Quotation &nbsp;<span style="font-size:13px;color:#141414;letter-spacing:0;">${esc(m.quoteNo)}</span></td></tr>

<tr><td style="padding:28px 28px 8px 28px;font-family:${FONT};color:#141414;">
  <h1 style="margin:0 0 10px 0;font-family:${FONT};font-size:26px;line-height:32px;font-weight:600;color:#141414;">Your custom offer</h1>
  <p style="margin:0 0 6px 0;font-size:15px;line-height:23px;color:#4A4A47;">${INTRO}</p>
</td></tr>

<tr><td style="padding:16px 28px 8px 28px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="#E60012" style="background:#E60012;"><a href="${esc(m.invoiceUrl)}" style="display:block;padding:14px 22px;font-family:${MONO};font-size:13px;line-height:16px;letter-spacing:0.06em;text-transform:uppercase;font-weight:500;color:#FFFFFF;text-decoration:none;white-space:nowrap;">Confirm your order</a></td>
  </tr></table>
  <p style="margin:14px 0 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:#4A4A47;">${PAYMENT_ACCEPTS_QUOTATION} ${CUSTOM_ORDER_FINAL}</p>
</td></tr>

<tr><td style="padding:24px 28px 0 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td colspan="2" style="padding:8px 12px;background:#FBE9EA;font-family:${MONO};font-size:11px;line-height:16px;letter-spacing:0.04em;text-transform:uppercase;color:#B3000E;">Items</td></tr>${rows}
  </table>
</td></tr>
${note}
<tr><td style="padding:18px 28px 26px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${MONO};font-size:14px;line-height:24px;color:#141414;">
    <tr><td style="color:#6B6A66;">Subtotal</td><td align="right">${esc(m.subtotal)}</td></tr>
    <tr><td style="color:#6B6A66;">Shipping</td><td align="right">${esc(m.shipping)}</td></tr>${tax}
    <tr><td style="padding-top:8px;border-top:1px solid #141414;font-weight:600;">Total</td><td align="right" style="padding-top:8px;border-top:1px solid #141414;font-size:17px;font-weight:600;">${esc(m.total)}</td></tr>
  </table>
  <p style="margin:10px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:#6B6A66;">${DUTIES}</p>
</td></tr>

<tr><td style="padding:18px 28px 22px 28px;border-top:1px solid #A8A59C;font-family:${FONT};font-size:13px;line-height:20px;color:#4A4A47;">
  ${QUESTIONS[0]}<a href="mailto:${QUESTIONS[1]}" style="color:#B3000E;text-decoration:underline;">${QUESTIONS[1]}</a>${QUESTIONS[2]}
</td></tr>

<tr><td style="padding:16px 28px 20px 28px;border-top:1px solid #D6D3CB;font-family:${FONT};font-size:14px;line-height:20px;color:#141414;">
  <span style="color:#E60012;">&#9632;</span>&nbsp; ${SIGN_OFF_LINE}<br>
  <span style="font-family:${MONO};font-size:11px;letter-spacing:0.04em;color:#6B6A66;">CALIB.TOOLS ENGINEERING · calib.tools</span>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function offerEmailText(m: OfferEmailModel): string {
  const lines = [
    `Your custom offer ${m.quoteNo}`,
    '',
    INTRO,
    '',
    `Confirm your order: ${m.invoiceUrl}`,
    '',
    `${PAYMENT_ACCEPTS_QUOTATION} ${CUSTOM_ORDER_FINAL}`,
    '',
    'Items',
    ...m.items.flatMap((it) => [`- ${it.title}, quantity ${it.quantity}: ${it.price}`, ...it.specs.map((s) => `    ${s.name}: ${s.value}`)]),
    ...(m.note ? ['', 'Specification and notes', m.note] : []),
    '',
    `Subtotal: ${m.subtotal}`,
    `Shipping: ${m.shipping}`,
    ...(m.tax ? [`Taxes: ${m.tax}`] : []),
    `Total: ${m.total}`,
    DUTIES,
    '',
    QUESTIONS.join(''),
    '',
    SIGN_OFF_LINE,
    'Calib.Tools Engineering · calib.tools',
  ];
  return lines.join('\n');
}

/** What we tell our own mailbox when a tagged draft could not be sent. */
export const REFUSAL_TEXT: Record<OfferRefusal | 'pdf-missing' | 'pdf-unavailable' | 'send-failed', string> = {
  completed: 'the draft order is already completed.',
  'not-custom': 'no line item carries a custom attribute, so this is not a custom offer.',
  'no-pdf': 'no line item has a valid _quote_pdf link (https://calib.tools/q/<id>/<key>.pdf).',
  'no-recipient': 'the draft order has no valid customer email address.',
  'no-order-link': 'the draft order has no invoice link.',
  'pdf-missing': 'the quotation behind the _quote_pdf link was not found (wrong link, or the offer was withdrawn).',
  'pdf-unavailable': 'the quotation PDF could not be drawn just now. Remove the tag and add it again to retry.',
  'send-failed': 'the email service did not accept the message. Remove the tag and add it again to retry.',
};
