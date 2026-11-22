import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { onRequestPost } from './offer-email';
import { encryptOffer, newOfferId } from '../../src/lib/offerCrypto';

const ROOT = resolve(import.meta.dirname, '../..');
const sampleJson = readFileSync(resolve(ROOT, 'docs/offers/sample-offer.json'), 'utf8');
const SECRET = 'whsec-test';

const assets = {
  fetch: async (input: Request | string) => {
    const path = new URL(String(input)).pathname;
    if (path === '/offer-config.json') return new Response(JSON.stringify({ domain: 'shop.example', token: 'tok' }));
    if (path.startsWith('/fonts/pdf/')) return new Response(readFileSync(resolve(ROOT, 'public', path.slice(1))));
    return new Response('', { status: 404 });
  },
};

async function sign(body: string, secret = SECRET): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

type Sent = { from: string; to: string[]; bcc?: string[]; reply_to: string; subject: string; html?: string; text: string; attachments?: { filename: string; content: string }[] };

describe('POST /api/offer-email', () => {
  let sent: Sent[] = [];
  let resendOk = true;
  let storefrontOk = true;
  let offers: Record<string, string> = {};
  let id = '', key = '';

  beforeEach(async () => {
    sent = []; resendOk = true; storefrontOk = true;
    id = newOfferId();
    const enc = await encryptOffer(sampleJson);
    key = enc.key;
    offers = { [id]: enc.payload };
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('api.resend.com')) {
        sent.push(JSON.parse(String(init?.body)));
        return new Response('{}', { status: resendOk ? 200 : 500 });
      }
      if (String(url).includes('/api/2025-07/graphql.json')) {
        if (!storefrontOk) return new Response('', { status: 500 });
        const handle = JSON.parse(String(init?.body)).variables.handle;
        const value = offers[handle];
        return new Response(JSON.stringify({ data: { metaobject: value === undefined ? null : { field: { value } } } }));
      }
      throw new Error('unexpected fetch ' + url);
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  const draft = (over: Record<string, unknown> = {}) => ({
    id: 1624942149980,
    name: '#D9',
    email: 'buyer@lab.example',
    status: 'open',
    tags: 'offer-test',
    currency: 'USD',
    note: 'Board: 400 x 300 mm.',
    invoice_url: 'https://shop.calib.tools/1/invoices/abc',
    subtotal_price: '100.00',
    total_tax: '0.00',
    total_price: '100.00',
    shipping_line: null,
    line_items: [{
      title: 'Custom ChArUco Calibration Target', quantity: 1, price: '100.00',
      properties: [
        { name: 'Quotation', value: 'Q-20261123-AB12' },
        { name: 'Board size', value: '400 x 300 mm' },
        { name: '_quote_pdf', value: `https://calib.tools/q/${id}/${key}.pdf` },
      ],
    }],
    ...over,
  });

  function env(store = new Map<string, string>(), over: Record<string, unknown> = {}) {
    return {
      SHOPIFY_WEBHOOK_SECRET: SECRET,
      RESEND_API_KEY: 're_test',
      ASSETS: assets,
      QUOTES: {
        get: async (k: string) => store.get(k) ?? null,
        put: async (k: string, v: string) => { store.set(k, v); },
        delete: async (k: string) => { store.delete(k); },
      },
      ...over,
    };
  }

  async function call(payload: unknown, e: object = env(), hmac?: string) {
    const body = JSON.stringify(payload);
    const request = new Request('https://calib.tools/api/offer-email', {
      method: 'POST', body, headers: { 'Content-Type': 'application/json', 'X-Shopify-Hmac-Sha256': hmac ?? (await sign(body)) },
    });
    const res = (await (onRequestPost as any)({ request, env: e })) as Response;
    return { status: res.status, json: res.status === 200 ? await res.json() : null };
  }

  it('answers 503 when it is not set up and 401 for a wrong signature, and sends nothing', async () => {
    expect((await call(draft(), env(new Map(), { RESEND_API_KEY: '' }))).status).toBe(503);
    expect((await call(draft(), env(new Map(), { SHOPIFY_WEBHOOK_SECRET: '' }))).status).toBe(503);
    expect((await call(draft(), env(new Map(), { QUOTES: undefined }))).status).toBe(503);
    expect((await call(draft(), env(), await sign('something else'))).status).toBe(401);
    expect((await call(draft(), env(), '')).status).toBe(401);
    expect(sent).toEqual([]);
  });

  it('ignores a draft order without one of the tags', async () => {
    const r = await call(draft({ tags: 'vip, offer-sent' }));
    expect(r.json).toEqual({ ok: true, action: 'ignored' });
    expect(sent).toEqual([]);
  });

  it('test tag: sends the email with the PDF attached to our own mailbox only', async () => {
    const r = await call(draft());
    expect(r.json).toEqual({ ok: true, test: 'sent', customer: [] });
    expect(sent).toHaveLength(1);
    const m = sent[0];
    expect(m.from).toBe('Calib.Tools <quotes@calib.tools>');
    expect(m.to).toEqual(['hello@calib.tools']);
    expect(m.bcc).toBeUndefined();
    expect(m.reply_to).toBe('hello@calib.tools');
    expect(m.subject).toBe('TEST: Your quotation Q-20261123-AB12 from Calib.Tools');
    expect(m.html).toContain('>Confirm your order</a>');
    expect(m.html).not.toContain(key);
    expect(m.text).toContain('https://shop.calib.tools/1/invoices/abc');
    expect(m.attachments).toHaveLength(1);
    expect(m.attachments![0].filename).toBe('Quotation-Q-SAMPLE-0001.pdf');
    expect(atob(m.attachments![0].content).slice(0, 5)).toBe('%PDF-');
  });

  it('test tag: a repeat within two minutes is not sent again', async () => {
    const e = env();
    await call(draft(), e);
    const r = await call(draft(), e);
    expect(r.json).toEqual({ ok: true, test: 'recent', customer: [] });
    expect(sent).toHaveLength(1);
  });

  it('send tag: sends to the customer once, with a copy to our mailbox', async () => {
    const store = new Map<string, string>();
    const e = env(store);
    const r = await call(draft({ tags: 'offer-send' }), e);
    expect(r.json).toEqual({ ok: true, test: 'no', customer: [{ tag: 'offer-send', result: 'sent' }] });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(['buyer@lab.example']);
    expect(sent[0].bcc).toEqual(['hello@calib.tools']);
    expect(sent[0].subject).toBe('Your quotation Q-20261123-AB12 from Calib.Tools');
    expect(sent[0].attachments).toHaveLength(1);

    // a later edit of the same draft, tag still on it
    const again = await call(draft({ tags: 'offer-send', note: 'edited' }), e);
    expect(again.json).toEqual({ ok: true, test: 'no', customer: [{ tag: 'offer-send', result: 'already-sent' }] });
    expect(sent).toHaveLength(1);

    // a deliberate resend uses the next tag
    const resend = await call(draft({ tags: 'offer-send, offer-send-2' }), e);
    expect(resend.json).toEqual({ ok: true, test: 'no', customer: [{ tag: 'offer-send', result: 'already-sent' }, { tag: 'offer-send-2', result: 'sent' }] });
    expect(sent).toHaveLength(2);
    expect([...store.keys()].some((k) => k.includes('buyer@'))).toBe(false);
  });

  it('send tag: when the email service refuses, nothing is recorded as sent and our mailbox is told', async () => {
    const store = new Map<string, string>();
    const e = env(store);
    resendOk = false;
    const r = await call(draft({ tags: 'offer-send' }), e);
    expect(r.json).toEqual({ ok: true, test: 'no', customer: [{ tag: 'offer-send', result: 'send-failed' }] });
    expect(store.has('offer-sent:1624942149980:offer-send')).toBe(false);
    resendOk = true;
    const retry = await call(draft({ tags: 'offer-send' }), e);
    expect(retry.json).toEqual({ ok: true, test: 'no', customer: [{ tag: 'offer-send', result: 'sent' }] });
  });

  it('refuses a draft that cannot be sent and tells our mailbox why, once', async () => {
    const e = env();
    const noPdf = draft({ tags: 'offer-send' });
    (noPdf.line_items[0].properties as any[]).pop();
    const r = await call(noPdf, e);
    expect(r.json).toEqual({ ok: true, action: 'refused', reason: 'no-pdf' });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(['hello@calib.tools']);
    expect(sent[0].subject).toBe('Offer email for #D9 was not sent');
    expect(sent[0].text).toContain('_quote_pdf');
    expect(sent[0].attachments).toBeUndefined();
    await call(noPdf, e);
    expect(sent).toHaveLength(1);
  });

  it('refuses when the quotation behind the link does not exist or cannot be drawn', async () => {
    offers = {};
    expect((await call(draft({ tags: 'offer-send' }))).json).toEqual({ ok: true, action: 'refused', reason: 'pdf-missing' });
    expect(sent.every((m) => m.to[0] === 'hello@calib.tools' && !m.attachments)).toBe(true);
    storefrontOk = false;
    expect((await call(draft({ tags: 'offer-send' }))).json).toEqual({ ok: true, action: 'refused', reason: 'pdf-unavailable' });
    expect(sent.some((m) => m.to[0] === 'buyer@lab.example')).toBe(false);
  });

  it('a completed draft order sends nothing', async () => {
    const r = await call(draft({ tags: 'offer-send', status: 'completed' }));
    expect(r.json).toEqual({ ok: true, action: 'refused', reason: 'completed' });
    expect(sent.some((m) => m.to[0] === 'buyer@lab.example')).toBe(false);
  });
});
