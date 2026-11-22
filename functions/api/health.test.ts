/**
 * GET /api/health against a stand-in for Shopify that refuses what the real one refuses.
 * The answer says only whether the Admin API is reachable, and where it stopped.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onRequestGet } from './health';
import { _resetMemCache } from '../../src/lib/shopifyAdmin';

const ADMIN_HOST = '7ape7i-8e.myshopify.com';
let refuse: '' | 'application_cannot_be_found' | 'app_not_installed' = '';
let queryFails = false;
let calls: string[] = [];

beforeEach(() => {
  _resetMemCache();
  refuse = '';
  queryFails = false;
  calls = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const u = String(url);
    const headers = new Headers(init.headers);
    if (!u.startsWith(`https://${ADMIN_HOST}/`)) throw new Error('unexpected fetch ' + u);
    if (!headers.get('User-Agent')) return new Response('<html>no</html>', { status: 403 });
    if (u.endsWith('/admin/oauth/access_token')) {
      calls.push('token');
      const form = new URLSearchParams(String(init.body));
      if (refuse || form.get('client_id') !== 'id' || form.get('client_secret') !== 'secret') {
        return new Response(JSON.stringify({ error: refuse || 'application_cannot_be_found' }), { status: 400 });
      }
      return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }));
    }
    if (headers.get('X-Shopify-Access-Token') !== 'tok') return new Response('{}', { status: 401 });
    calls.push('query');
    if (queryFails) return new Response('{}', { status: 500 });
    return new Response(JSON.stringify({ data: { shop: { name: 'Calib.Tools' } } }));
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const ENV = { SHOPIFY_CLIENT_ID: 'id', SHOPIFY_CLIENT_SECRET: 'secret', SHOPIFY_STORE_DOMAIN: 'shop.calib.tools' };
async function get(env: Record<string, string> = ENV) {
  const res = await onRequestGet({ request: new Request('https://calib.tools/api/health'), env } as any);
  return { status: res.status, data: (await res.json()) as { ok: boolean; code?: string }, res };
}

describe('GET /api/health', () => {
  it('ok when the token exchange and one query both work', async () => {
    const r = await get();
    expect(r.status).toBe(200);
    expect(r.data).toEqual({ ok: true });
    expect(calls).toEqual(['token', 'query']);
    expect(r.res.headers.get('Cache-Control')).toBe('no-store');
  });
  it('says nothing about the shop', async () => {
    const r = await get();
    expect(JSON.stringify(r.data).includes('Calib')).toBe(false);
  });
  it('missing settings: S0', async () => {
    const r = await get({ SHOPIFY_STORE_DOMAIN: 'shop.calib.tools' });
    expect(r.status).toBe(503);
    expect(r.data).toEqual({ ok: false, code: 'S0' });
    expect(calls).toEqual([]);
  });
  it.each(['application_cannot_be_found', 'app_not_installed'] as const)('refused token (%s): S1-400, the name stays in the log', async (name) => {
    refuse = name;
    const r = await get();
    expect(r.status).toBe(503);
    expect(r.data).toEqual({ ok: false, code: 'S1-400' });
    expect(JSON.stringify(r.data).includes(name)).toBe(false);
    expect((console.error as any).mock.calls.flat().join(' ').includes(name)).toBe(true);
  });
  it('wrong credentials are refused like the real endpoint does', async () => {
    const r = await get({ ...ENV, SHOPIFY_CLIENT_ID: 'other' });
    expect(r.data.code).toBe('S1-400');
  });
  it('a failed query after a good token: S2', async () => {
    queryFails = true;
    const r = await get();
    expect(r.status).toBe(503);
    expect(r.data).toEqual({ ok: false, code: 'S2' });
  });
});
