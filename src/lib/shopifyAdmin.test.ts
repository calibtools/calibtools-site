import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAdminToken, adminFetch, _resetMemCache } from './shopifyAdmin';

// --- helpers ---

function mockEnv(overrides: Record<string, any> = {}) {
  return {
    SHOPIFY_STORE_DOMAIN: 'shop.example.com',
    SHOPIFY_CLIENT_ID: 'id-123',
    SHOPIFY_CLIENT_SECRET: 'secret-456',
    ...overrides,
  };
}

function kvMock(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    put: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    delete: vi.fn(async (k: string) => { store.delete(k); }),
  } as unknown as KVNamespace;
}

let fetchCalls: Array<{ url: string; init: RequestInit }> = [];

function stubFetch(...responses: Array<{ status: number; body: unknown }>) {
  let i = 0;
  globalThis.fetch = vi.fn(async (input: any, init: any) => {
    const url = typeof input === 'string' ? input : input.url ?? String(input);
    fetchCalls.push({ url, init: init ?? {} });
    const r = responses[Math.min(i++, responses.length - 1)];
    return { ok: r.status >= 200 && r.status < 300, status: r.status, statusText: 'test', json: async () => r.body } as Response;
  }) as any;
}

beforeEach(() => {
  _resetMemCache();
  fetchCalls = [];
});
afterEach(() => { vi.restoreAllMocks(); });

// --- getAdminToken ---

describe('getAdminToken', () => {
  it('throws when credentials are missing', async () => {
    await expect(getAdminToken({} as any)).rejects.toThrow('Missing');
  });

  it('mints a token via form-encoded POST', async () => {
    stubFetch({ status: 200, body: { access_token: 'tok-abc', expires_in: 3600 } });
    const token = await getAdminToken(mockEnv());
    expect(token).toBe('tok-abc');
    expect(fetchCalls).toHaveLength(1);
    const body = fetchCalls[0].init.body as URLSearchParams;
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe('id-123');
    expect(body.get('client_secret')).toBe('secret-456');
    expect(fetchCalls[0].init.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' }),
    );
  });

  it('caches in memory — second call does not refetch', async () => {
    stubFetch({ status: 200, body: { access_token: 'tok-1', expires_in: 3600 } });
    const t1 = await getAdminToken(mockEnv());
    const t2 = await getAdminToken(mockEnv());
    expect(t1).toBe('tok-1');
    expect(t2).toBe('tok-1');
    expect(fetchCalls).toHaveLength(1);
  });

  it('caches in KV — second call reads from KV', async () => {
    const ns = kvMock();
    stubFetch({ status: 200, body: { access_token: 'tok-kv', expires_in: 3600 } });
    const env = mockEnv({ WEBHOOKS: ns });
    const t1 = await getAdminToken(env);
    expect(t1).toBe('tok-kv');
    expect(ns.put).toHaveBeenCalledWith('shopify_admin_token', 'tok-kv', { expirationTtl: 3300 });

    // Reset mem cache so only KV is checked
    _resetMemCache();
    const t2 = await getAdminToken(env);
    expect(t2).toBe('tok-kv');
    // Only 1 fetch total — second came from KV
    expect(fetchCalls).toHaveLength(1);
  });
});

// --- adminFetch ---

describe('adminFetch', () => {
  it('sends query with token header', async () => {
    stubFetch(
      { status: 200, body: { access_token: 'tok-q', expires_in: 3600 } },
      { status: 200, body: { data: { shop: { name: 'Test' } } } },
    );
    const data = await adminFetch(mockEnv(), '{ shop { name } }');
    expect(data).toEqual({ shop: { name: 'Test' } });
    expect(fetchCalls[1].init.headers).toEqual(
      expect.objectContaining({ 'X-Shopify-Access-Token': 'tok-q' }),
    );
  });

  it('retries once on 401 after clearing cache', async () => {
    // Pre-seed a token in memory
    stubFetch({ status: 200, body: { access_token: 'tok-old', expires_in: 3600 } });
    await getAdminToken(mockEnv());
    fetchCalls = [];

    // Now adminFetch: first GraphQL call 401, then re-mint token, then retry succeeds
    stubFetch(
      { status: 401, body: {} },                                         // 1st GraphQL
      { status: 200, body: { access_token: 'tok-new', expires_in: 3600 } }, // re-mint
      { status: 200, body: { data: { ok: true } } },                     // 2nd GraphQL
    );
    const data = await adminFetch(mockEnv(), '{ ok }');
    expect(data).toEqual({ ok: true });
    expect(fetchCalls).toHaveLength(3);
  });

  it('throws on GraphQL errors', async () => {
    stubFetch(
      { status: 200, body: { access_token: 'tok-e', expires_in: 3600 } },
      { status: 200, body: { errors: [{ message: 'Bad field' }] } },
    );
    _resetMemCache();
    await expect(adminFetch(mockEnv(), '{ bad }')).rejects.toThrow('Bad field');
  });
});
