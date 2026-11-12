import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { onRequestGet } from './[id]/[file]';
import { encryptOffer, newOfferId } from '../../src/lib/offerCrypto';

const ROOT = resolve(import.meta.dirname, '../..');
const sampleJson = readFileSync(resolve(ROOT, 'docs/offers/sample-offer.json'), 'utf8');

/** Site assets: the three PDF fonts and the Storefront settings file. */
const assets = (config: object | null = { domain: 'shop.example', token: 'tok' }) => ({
  fetch: async (input: Request | string) => {
    const path = new URL(String(input)).pathname;
    if (path === '/offer-config.json') return config ? new Response(JSON.stringify(config)) : new Response('', { status: 404 });
    if (path.startsWith('/fonts/pdf/')) return new Response(readFileSync(resolve(ROOT, 'public', path.slice(1))));
    return new Response('', { status: 404 });
  },
});

/** Fake Storefront API holding one metaobject payload per handle. */
function stubStorefront(store: Record<string, string>) {
  const calls: { url: string; token: string | null; handle: string }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const handle = JSON.parse(String(init?.body)).variables.handle;
    calls.push({ url: String(url), token: new Headers(init?.headers).get('X-Shopify-Storefront-Access-Token'), handle });
    const value = store[handle];
    return new Response(JSON.stringify({ data: { metaobject: value === undefined ? null : { field: { value } } } }));
  }));
  return calls;
}

const get = (path: string, env: object) =>
  onRequestGet({ request: new Request(`https://calib.tools${path}`), env, params: { id: path.split('/')[2], file: path.split('/')[3] } } as any);

afterEach(() => vi.unstubAllGlobals());

describe('GET /q/<id>/<key>.pdf', () => {
  it('returns the quotation PDF for the right id and key', async () => {
    const id = newOfferId();
    const { payload, key } = await encryptOffer(sampleJson);
    const calls = stubStorefront({ [id]: payload });
    const res = await get(`/q/${id}/${key}.pdf`, { ASSETS: assets() });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="Quotation-Q-SAMPLE-0001.pdf"');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(calls).toEqual([{ url: 'https://shop.example/api/2025-07/graphql.json', token: 'tok', handle: id }]);
  });
  it('prefers the Storefront settings from the environment', async () => {
    const id = newOfferId();
    const { payload, key } = await encryptOffer(sampleJson);
    const calls = stubStorefront({ [id]: payload });
    const res = await get(`/q/${id}/${key}.pdf`, { ASSETS: assets(null), PUBLIC_SHOPIFY_DOMAIN: 'env.example', PUBLIC_SHOPIFY_STOREFRONT_TOKEN: 'envtok' });
    expect(res.status).toBe(200);
    expect(calls[0].url).toContain('env.example');
    expect(calls[0].token).toBe('envtok');
  });
  it('answers 404 for a wrong key, an unknown id, bad shapes and unusable data', async () => {
    const id = newOfferId();
    const { payload, key } = await encryptOffer(sampleJson);
    const other = (await encryptOffer('x')).key;
    const broken = await encryptOffer('{"no":"Q-1"}');
    const brokenId = newOfferId();
    const calls = stubStorefront({ [id]: payload, [brokenId]: broken.payload });
    const env = { ASSETS: assets() };
    expect((await get(`/q/${id}/${other}.pdf`, env)).status).toBe(404);
    expect((await get(`/q/${newOfferId()}/${key}.pdf`, env)).status).toBe(404);
    expect((await get(`/q/${brokenId}/${broken.key}.pdf`, env)).status).toBe(404);
    const before = calls.length;
    expect((await get(`/q/${id}/${key}.txt`, env)).status).toBe(404);
    expect((await get(`/q/NOT-AN-ID/${key}.pdf`, env)).status).toBe(404);
    expect((await get(`/q/${id}/short.pdf`, env)).status).toBe(404);
    expect(calls.length).toBe(before);
  });
  it('answers 503 when the Storefront settings are missing', async () => {
    const id = newOfferId();
    const { key } = await encryptOffer(sampleJson);
    stubStorefront({});
    expect((await get(`/q/${id}/${key}.pdf`, { ASSETS: assets(null) })).status).toBe(503);
    expect((await get(`/q/${id}/${key}.pdf`, {})).status).toBe(503);
  });
});
