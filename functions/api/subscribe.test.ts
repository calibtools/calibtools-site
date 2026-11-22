/**
 * POST /api/subscribe against a stand-in for Shopify that refuses what the real one refuses:
 * requests without a User-Agent (403 with an HTML page), a wrong grant, a missing access token.
 * Every way the endpoint can fail has its own reference code, so one screenshot tells which step broke.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onRequestPost } from './subscribe';
import { _resetMemCache } from '../../src/lib/shopifyAdmin';

interface Shop {
  customers: Map<string, { id: string; tags: string[]; consent?: string }>;
  calls: string[];
  fail: Partial<Record<'token' | 'search' | 'create' | 'createRejected' | 'consent' | 'tag', boolean>>;
}
let shop: Shop;
let human = true;

const html403 = () => new Response('<html>You do not have permission to access this website</html>', { status: 403, headers: { 'Content-Type': 'text/html' } });
const gql = (data: unknown) => new Response(JSON.stringify({ data }), { headers: { 'Content-Type': 'application/json' } });
const gqlError = (message: string) => new Response(JSON.stringify({ errors: [{ message }] }), { headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  _resetMemCache();
  human = true;
  shop = { customers: new Map(), calls: [], fail: {} };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const u = String(url);
    const headers = new Headers(init.headers);
    if (u.includes('siteverify')) return new Response(JSON.stringify({ success: human }));
    if (!u.startsWith('https://shop.calib.tools/')) throw new Error('unexpected fetch ' + u);
    if (!headers.get('User-Agent')) return html403();
    if (u.endsWith('/admin/oauth/access_token')) {
      shop.calls.push('token');
      const form = new URLSearchParams(String(init.body));
      if (shop.fail.token || form.get('grant_type') !== 'client_credentials' || form.get('client_id') !== 'id' || form.get('client_secret') !== 'secret') {
        return new Response(JSON.stringify({ error: 'invalid_client' }), { status: 400 });
      }
      return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }));
    }
    if (headers.get('X-Shopify-Access-Token') !== 'tok') return new Response('{}', { status: 401 });
    const { query, variables } = JSON.parse(String(init.body)) as { query: string; variables: any };
    if (query.includes('FindCustomer')) {
      shop.calls.push('search');
      if (shop.fail.search) return gqlError('Access denied for customers field.');
      const email = String(variables.query).replace(/^email:/, '');
      const c = shop.customers.get(email);
      return gql({ customers: { nodes: c ? [{ id: c.id }] : [] } });
    }
    if (query.includes('customerCreate')) {
      shop.calls.push('create');
      if (shop.fail.create) return gqlError('Access denied for customerCreate field.');
      if (shop.fail.createRejected) return gql({ customerCreate: { customer: null, userErrors: [{ field: ['email'], message: 'Email is invalid' }] } });
      const id = `gid://shopify/Customer/${shop.customers.size + 1}`;
      shop.customers.set(variables.input.email, { id, tags: [] });
      return gql({ customerCreate: { customer: { id }, userErrors: [] } });
    }
    if (query.includes('customerEmailMarketingConsentUpdate')) {
      shop.calls.push('consent');
      if (shop.fail.consent) return gqlError('Access denied for customerEmailMarketingConsentUpdate field.');
      const c = [...shop.customers.values()].find((x) => x.id === variables.input.customerId)!;
      c.consent = variables.input.emailMarketingConsent.marketingState;
      return gql({ customerEmailMarketingConsentUpdate: { customer: { id: c.id, emailMarketingConsent: { marketingState: 'SUBSCRIBED' } }, userErrors: [] } });
    }
    if (query.includes('tagsAdd')) {
      shop.calls.push('tag');
      if (shop.fail.tag) return gqlError('Access denied for tagsAdd field.');
      const c = [...shop.customers.values()].find((x) => x.id === variables.id)!;
      c.tags.push(...variables.tags);
      return gql({ tagsAdd: { userErrors: [] } });
    }
    throw new Error('unexpected query ' + query.slice(0, 60));
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const ENV = { SHOPIFY_STORE_DOMAIN: 'shop.calib.tools', SHOPIFY_CLIENT_ID: 'id', SHOPIFY_CLIENT_SECRET: 'secret', TURNSTILE_SECRET_KEY: 'ts' };

async function post(body: Record<string, string>, env: Record<string, string> = ENV) {
  const request = new Request('https://calib.tools/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turnstile: 'human-token', ...body }) });
  const res = (await (onRequestPost as any)({ request, env })) as Response;
  return { status: res.status, data: (await res.json()) as { ok: boolean; state?: string; message?: string; code?: string } };
}

describe('POST /api/subscribe: release notification', () => {
  it('creates the customer, tags it and sets no marketing consent', async () => {
    const r = await post({ email: 'eng@example-robotics.com', tag: 'notify:plumbline' });
    expect(r).toEqual({ status: 200, data: { ok: true, state: 'NOTIFY' } });
    expect(shop.calls).toEqual(['token', 'search', 'create', 'tag']);
    expect(shop.customers.get('eng@example-robotics.com')).toMatchObject({ tags: ['notify:plumbline'] });
    expect(shop.customers.get('eng@example-robotics.com')!.consent).toBeUndefined();
  });

  it('tags a customer who exists already, without creating a second one', async () => {
    shop.customers.set('eng@example-robotics.com', { id: 'gid://shopify/Customer/7', tags: ['custom-quote'] });
    const r = await post({ email: 'Eng@Example-Robotics.com', tag: 'notify:plumbline' });
    expect(r.data.ok).toBe(true);
    expect(shop.calls).toEqual(['token', 'search', 'tag']);
    expect(shop.customers.get('eng@example-robotics.com')!.tags).toEqual(['custom-quote', 'notify:plumbline']);
  });
});

describe('POST /api/subscribe: newsletter', () => {
  it('sets marketing consent', async () => {
    const r = await post({ email: 'eng@example-robotics.com' });
    expect(r).toEqual({ status: 200, data: { ok: true, state: 'SUBSCRIBED' } });
    expect(shop.calls).toEqual(['token', 'search', 'create', 'consent']);
  });
});

describe('POST /api/subscribe: refusals before Shopify', () => {
  it('no human check token: 403, Shopify is not called', async () => {
    const r = await post({ email: 'eng@example-robotics.com', turnstile: '' });
    expect(r.status).toBe(403);
    expect(r.data.message).toBe('Please complete the human check.');
    expect(shop.calls).toEqual([]);
  });
  it('failed human check: 403', async () => {
    human = false;
    expect((await post({ email: 'eng@example-robotics.com' })).status).toBe(403);
  });
  it('missing Shopify settings: 503 with its own code', async () => {
    const r = await post({ email: 'eng@example-robotics.com' }, { TURNSTILE_SECRET_KEY: 'ts' });
    expect(r.status).toBe(503);
    expect(r.data.code).toBe('S0');
  });
});

describe('POST /api/subscribe: each failure has its own reference', () => {
  const cases: [keyof Shop['fail'], string, string][] = [
    ['token', 'S1', 'notify:plumbline'],
    ['search', 'S2', 'notify:plumbline'],
    ['create', 'S3', 'notify:plumbline'],
    ['createRejected', 'S4', 'notify:plumbline'],
    ['consent', 'S5', ''],
    ['tag', 'S6', 'notify:plumbline'],
  ];
  it.each(cases)('%s fails: 500 with reference %s shown in the message', async (step, code, tag) => {
    shop.fail[step] = true;
    const r = await post({ email: 'eng@example-robotics.com', ...(tag ? { tag } : {}) });
    expect(r.status).toBe(500);
    expect(r.data.ok).toBe(false);
    expect(r.data.code).toBe(code);
    expect(r.data.message).toBe(`Something went wrong (${code}). Please try again.`);
  });

  it('the references are all different', () => {
    expect(new Set(cases.map((c) => c[1])).size).toBe(cases.length);
  });

  it('a failed tag does not fail a newsletter signup, where the tag is an extra', async () => {
    shop.fail.tag = true;
    const r = await post({ email: 'eng@example-robotics.com', tag: 'revision:charuco-composite' });
    expect(r.data).toEqual({ ok: true, state: 'SUBSCRIBED' });
  });

  it('logs the step and the reason, never the email address', async () => {
    shop.fail.create = true;
    await post({ email: 'eng@example-robotics.com', tag: 'notify:plumbline' });
    const logged = (console.error as any).mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(logged).toContain('S3');
    expect(logged).toContain('Access denied for customerCreate field.');
    expect(logged.includes('example-robotics')).toBe(false);
  });
});
