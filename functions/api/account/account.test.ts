import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { onRequestGet as login } from './login';
import { onRequestGet as callback } from './callback';
import { onRequestGet as logout } from './logout';
import { onRequestGet as summary } from './summary';
import { onRequestPost as patterns } from './patterns';
import { AUTHORIZE_URL, GRAPHQL_URL, LOGOUT_URL, TOKEN_URL, SESSION_COOKIE, seal, codeChallenge, type Session } from '../../../src/lib/account';

const ENV = { SHOPIFY_CUSTOMER_CLIENT_ID: 'cid', SHOPIFY_CUSTOMER_CLIENT_SECRET: 'csecret', ACCOUNT_SESSION_SECRET: 's'.repeat(64) };
const ORIGIN = 'https://calib.tools';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (fn: any, req: Request, env: object = ENV): Promise<Response> => fn({ request: req, env });

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const idToken = (nonce: string) => `${b64({ alg: 'RS256' })}.${b64({ nonce })}.sig`;

async function cookieFor(s: Partial<Session> = {}) {
  const full: Session = { at: 'at1', rt: 'rt1', exp: Date.now() + 3_600_000, id: 'idt1', ...s };
  return `${SESSION_COOKIE}=${await seal(ENV.ACCOUNT_SESSION_SECRET, 'session', full)}`;
}

let calls: { url: string; init?: RequestInit }[] = [];
let gql: (body: { query: string; variables: Record<string, unknown> }) => unknown;
let token: (form: URLSearchParams) => Response;

beforeEach(() => {
  calls = [];
  gql = () => ({ data: {} });
  token = () => new Response('{}', { status: 400 });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    // Shopify as it really behaves: no User-Agent, no service (403 with an HTML page)
    if (!(init?.headers as Record<string, string> | undefined)?.['User-Agent']) return new Response('<html>You do not have permission to access this website</html>', { status: 403 });
    if (url === TOKEN_URL) return token(new URLSearchParams(String(init?.body)));
    if (url === GRAPHQL_URL) return new Response(JSON.stringify(gql(JSON.parse(String(init?.body)))));
    throw new Error('unexpected fetch ' + url);
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('login', () => {
  it('redirects to Shopify with PKCE and sets only the 10-minute login cookie', async () => {
    const res = await run(login, new Request(`${ORIGIN}/api/account/login?return=/tools/generator/?rows=7`));
    expect(res.status).toBe(302);
    expect(res.headers.get('Set-Cookie')).toMatch(/^ct_login=[A-Za-z0-9_-]{43}; Path=\/api\/account\/; Max-Age=600; HttpOnly; Secure; SameSite=Lax$/);
    const u = new URL(res.headers.get('Location')!);
    expect(`${u.origin}${u.pathname}`).toBe(AUTHORIZE_URL);
    expect(u.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/account/callback`);
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('state')!.length).toBeGreaterThan(40);
  });
  it('sends to /account/ with a notice when not configured', async () => {
    const res = await run(login, new Request(`${ORIGIN}/api/account/login`), {});
    expect(res.headers.get('Location')).toBe(`${ORIGIN}/account/?error=unavailable`);
  });
});

describe('callback', () => {
  async function startLogin(ret = '/tools/generator/?rows=7') {
    const res = await run(login, new Request(`${ORIGIN}/api/account/login?return=${encodeURIComponent(ret)}`));
    const u = new URL(res.headers.get('Location')!);
    const cookie = res.headers.get('Set-Cookie')!.split(';')[0];
    return { state: u.searchParams.get('state')!, nonce: u.searchParams.get('nonce')!, challenge: u.searchParams.get('code_challenge')!, cookie };
  }
  const back = (qs: string, cookie: string) => new Request(`${ORIGIN}/api/account/callback?${qs}`, { headers: { Cookie: cookie } });

  it('exchanges the code, sets the session cookie and returns to the start page', async () => {
    const { state, nonce, challenge, cookie: lc } = await startLogin();
    let form: URLSearchParams | undefined;
    token = (f) => {
      form = f;
      return new Response(JSON.stringify({ access_token: 'at', refresh_token: 'rt', id_token: idToken(nonce), expires_in: 3600 }));
    };
    const res = await run(callback, back(`code=abc&state=${state}`, lc));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/tools/generator/?rows=7');
    const [cookie, cleared] = res.headers.getSetCookie();
    expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE}=[A-Za-z0-9_-]+; Path=/; Max-Age=\\d+; HttpOnly; Secure; SameSite=Lax$`));
    expect(cleared).toMatch(/^ct_login=; Path=\/api\/account\/; Max-Age=0/);
    expect(form?.get('grant_type')).toBe('authorization_code');
    expect(form?.get('code')).toBe('abc');
    expect(await codeChallenge(form!.get('code_verifier')!)).toBe(challenge);
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe('Basic ' + btoa('cid:csecret'));
  });
  it('refuses a wrong nonce, a bad state, another browser or a cancelled sign-in', async () => {
    const { state, nonce, cookie: lc } = await startLogin();
    token = () => new Response(JSON.stringify({ access_token: 'at', id_token: idToken('other') }));
    const wrongNonce = await run(callback, back(`code=abc&state=${state}`, lc));
    expect(wrongNonce.headers.get('Location')).toBe('/account/?error=nonce');
    expect(wrongNonce.headers.getSetCookie().some((c) => c.startsWith('ct_session='))).toBe(false);
    const badState = await run(callback, back('code=abc&state=forged', lc));
    expect(badState.headers.get('Location')).toBe('/account/?error=expired');
    token = () => new Response(JSON.stringify({ access_token: 'at', id_token: idToken(nonce) }));
    const otherBrowser = await run(callback, back(`code=abc&state=${state}`, ''));
    expect(otherBrowser.headers.get('Location')).toBe('/account/?error=expired');
    expect(calls.filter((c) => c.url === TOKEN_URL)).toHaveLength(1);
    calls = [];
    token = () => new Response(JSON.stringify({ error: 'invalid_client', error_description: 'x' }), { status: 401 });
    const rejected = await run(callback, back(`code=abc&state=${state}`, lc));
    expect(rejected.headers.get('Location')).toBe('/account/?error=token&detail=401_invalid_client');
    token = () => new Response('<html>You do not have permission to access this website</html>', { status: 403 });
    const blocked = await run(callback, back(`code=abc&state=${state}`, lc));
    expect(blocked.headers.get('Location')).toBe('/account/?error=token&detail=403_not_json');
    token = () => new Response(JSON.stringify({ access_token: 'at' }));
    const noId = await run(callback, back(`code=abc&state=${state}`, lc));
    expect(noId.headers.get('Location')).toBe('/account/?error=idtoken');
    const cancelled = await run(callback, back(`error=access_denied&state=${state}`, lc));
    expect(cancelled.headers.get('Location')).toBe('/account/?error=cancelled');
  });
});

describe('logout', () => {
  it('clears the cookie and ends the Shopify session', async () => {
    const res = await run(logout, new Request(`${ORIGIN}/api/account/logout`, { headers: { Cookie: await cookieFor() } }));
    const u = new URL(res.headers.get('Location')!);
    expect(`${u.origin}${u.pathname}`).toBe(LOGOUT_URL);
    expect(u.searchParams.get('id_token_hint')).toBe('idt1');
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
  it('goes home when not signed in', async () => {
    const res = await run(logout, new Request(`${ORIGIN}/api/account/logout`));
    expect(res.headers.get('Location')).toBe(`${ORIGIN}/`);
  });
});

const customer = {
  id: 'gid://shopify/Customer/1',
  firstName: 'Ada',
  emailAddress: { emailAddress: 'ada@lab.example' },
  savedPatterns: { value: JSON.stringify([{ id: 'P-AAAAAA', name: 'Rig A', path: '/tools/generator/?rows=7&cols=10', savedAt: '2026-11-15T10:00:00Z' }]) },
  orders: { nodes: [{ id: 'o1', name: '#1001', processedAt: '2026-11-01T10:00:00Z', financialStatus: 'PAID', fulfillmentStatus: 'IN_PROGRESS', statusPageUrl: 'https://shop.calib.tools/s/1', totalPrice: { amount: '120.0', currencyCode: 'EUR' } }] },
  draftOrders: { nodes: [{ id: 'd1', name: '#D2', createdAt: '2026-11-10T10:00:00Z', updatedAt: '2026-11-11T10:00:00Z', status: 'INVOICE_SENT', invoiceUrl: 'https://shop.calib.tools/i/2', totalPrice: { amount: '900.0', currencyCode: 'EUR' } }] },
};

describe('summary', () => {
  it('401 without a session', async () => {
    const res = await run(summary, new Request(`${ORIGIN}/api/account/summary`));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ signedIn: false, available: true });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
  it('returns patterns, quotes and orders', async () => {
    gql = () => ({ data: { customer } });
    const res = await run(summary, new Request(`${ORIGIN}/api/account/summary`, { headers: { Cookie: await cookieFor() } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe('ada@lab.example');
    expect(body.patterns).toHaveLength(1);
    expect(body.quotes[0]).toEqual({ name: '#D2', date: '2026-11-11T10:00:00Z', status: 'sent', total: { amount: '900.0', currencyCode: 'EUR' }, url: 'https://shop.calib.tools/i/2' });
    expect(body.orders[0]).toMatchObject({ name: '#1001', payment: 'paid', fulfillment: 'in progress' });
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe('at1');
  });
  it('refreshes an expiring token and writes the new session', async () => {
    token = (f) => {
      expect(f.get('grant_type')).toBe('refresh_token');
      expect(f.get('refresh_token')).toBe('rt1');
      return new Response(JSON.stringify({ access_token: 'at2', expires_in: 3600 }));
    };
    gql = () => ({ data: { customer } });
    const res = await run(summary, new Request(`${ORIGIN}/api/account/summary`, { headers: { Cookie: await cookieFor({ exp: Date.now() - 1 }) } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toMatch(new RegExp(`^${SESSION_COOKIE}=`));
    expect((calls[1].init?.headers as Record<string, string>).Authorization).toBe('at2');
  });
  it('signs out when the refresh fails', async () => {
    const res = await run(summary, new Request(`${ORIGIN}/api/account/summary`, { headers: { Cookie: await cookieFor({ exp: Date.now() - 1 }) } }));
    expect(res.status).toBe(401);
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});

describe('patterns', () => {
  const post = async (body: object, headers: Record<string, string> = {}) =>
    run(patterns, new Request(`${ORIGIN}/api/account/patterns`, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Cookie: await cookieFor(), ...headers },
      body: JSON.stringify(body),
    }));

  it('rejects cross-site posts', async () => {
    const res = await post({ action: 'add', name: 'x', path: '/tools/generator/?rows=7' }, { Origin: 'https://evil.example' });
    expect(res.status).toBe(403);
    expect(calls).toHaveLength(0);
  });
  it('adds a pattern to the customer record', async () => {
    let set: Record<string, unknown> | undefined;
    gql = ({ query, variables }) => {
      if (query.includes('metafieldsSet')) {
        set = (variables.metafields as Record<string, unknown>[])[0];
        return { data: { metafieldsSet: { metafields: [{ key: 'saved_patterns' }], userErrors: [] } } };
      }
      return { data: { customer: { id: customer.id, savedPatterns: customer.savedPatterns } } };
    };
    const res = await post({ action: 'add', name: 'Rig B', path: '/tools/generator/?rows=6&cols=9' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.patterns.map((p: { name: string }) => p.name)).toEqual(['Rig B', 'Rig A']);
    expect(set).toMatchObject({ ownerId: customer.id, namespace: 'calibtools', key: 'saved_patterns', type: 'json' });
  });
  it('renames a saved pattern', async () => {
    let stored = '';
    gql = ({ query, variables }) => {
      if (query.includes('metafieldsSet')) {
        stored = String((variables.metafields as Record<string, unknown>[])[0].value);
        return { data: { metafieldsSet: { metafields: [{ key: 'saved_patterns' }], userErrors: [] } } };
      }
      return { data: { customer: { id: customer.id, savedPatterns: customer.savedPatterns } } };
    };
    const res = await post({ action: 'rename', id: 'P-AAAAAA', name: 'Line 3 camera' });
    expect(res.status).toBe(200);
    expect((await res.json()).patterns[0].name).toBe('Line 3 camera');
    expect(JSON.parse(stored)[0]).toMatchObject({ id: 'P-AAAAAA', name: 'Line 3 camera' });
  });
  it('rejects a link that is not a generator pattern', async () => {
    gql = () => ({ data: { customer: { id: customer.id, savedPatterns: null } } });
    const res = await post({ action: 'add', name: 'x', path: 'https://evil.example/' });
    expect(res.status).toBe(400);
  });
});
