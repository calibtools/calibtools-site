/**
 * Server side of customer accounts, used by functions/api/account/*.
 * Reads the sealed session cookie, refreshes the access token when it is about to expire,
 * and talks to the Customer Account API. Responses are never cached.
 */
import {
  GRAPHQL_URL, TOKEN_URL, SESSION_COOKIE, PATTERNS_NAMESPACE, PATTERNS_KEY,
  open, seal, readCookie, needsRefresh, sessionFromTokens, sessionCookie, clearSessionCookie,
  parseSavedPatterns, type Session, type TokenResponse, type SavedPattern,
} from './account';

export interface AccountEnv {
  SHOPIFY_CUSTOMER_CLIENT_ID?: string;
  SHOPIFY_CUSTOMER_CLIENT_SECRET?: string;
  ACCOUNT_SESSION_SECRET?: string;
}

export function accountConfigured(env: AccountEnv): env is Required<AccountEnv> {
  return Boolean(env.SHOPIFY_CUSTOMER_CLIENT_ID && env.SHOPIFY_CUSTOMER_CLIENT_SECRET && (env.ACCOUNT_SESSION_SECRET ?? '').length >= 32);
}

export function basicAuth(env: Required<AccountEnv>): string {
  return 'Basic ' + btoa(`${env.SHOPIFY_CUSTOMER_CLIENT_ID}:${env.SHOPIFY_CUSTOMER_CLIENT_SECRET}`);
}

export type TokenResult =
  | { ok: true; tokens: TokenResponse }
  | { ok: false; status: number; error: string; description: string };

/** Short, URL-safe form of an OAuth error name ("invalid_client"); anything else becomes ''. */
export function safeErrorName(v: unknown): string {
  return typeof v === 'string' && /^[a-z_]{1,40}$/.test(v) ? v : '';
}

/** Token endpoint call that keeps the reason for a failure (status and OAuth error name; never the secret, code or tokens). */
export async function tokenExchange(env: Required<AccountEnv>, body: Record<string, string>): Promise<TokenResult> {
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: basicAuth(env) },
      body: new URLSearchParams(body).toString(),
    });
  } catch {
    return { ok: false, status: 0, error: 'network', description: '' };
  }
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    const v = JSON.parse(text);
    if (v && typeof v === 'object') json = v;
  } catch {
    // not JSON: keep the status, the body is not logged
  }
  if (res.ok && typeof json.access_token === 'string') return { ok: true, tokens: json as unknown as TokenResponse };
  return {
    ok: false,
    status: res.status,
    error: safeErrorName(json.error) || (res.ok ? 'no_access_token' : 'not_json'),
    description: typeof json.error_description === 'string' ? json.error_description.slice(0, 200) : '',
  };
}

export async function tokenRequest(env: Required<AccountEnv>, body: Record<string, string>): Promise<TokenResponse | null> {
  const r = await tokenExchange(env, body);
  if (!r.ok) console.log(JSON.stringify({ at: 'account.token', grant: body.grant_type, status: r.status, error: r.error, description: r.description }));
  return r.ok ? r.tokens : null;
}

export async function readSession(request: Request, env: Required<AccountEnv>): Promise<Session | null> {
  const raw = readCookie(request.headers.get('Cookie'), SESSION_COOKIE);
  if (!raw) return null;
  const s = await open<Session>(env.ACCOUNT_SESSION_SECRET, 'session', raw);
  return s && typeof s.at === 'string' && typeof s.rt === 'string' && typeof s.exp === 'number' ? s : null;
}

export async function writeSession(env: Required<AccountEnv>, s: Session): Promise<string> {
  return sessionCookie(await seal(env.ACCOUNT_SESSION_SECRET, 'session', s));
}

export const NO_STORE = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...NO_STORE, ...extra } });
}

export class GraphQLError extends Error {}

export async function customerGraphQL<T>(s: Session, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: s.at },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401) throw new GraphQLError('unauthorized');
  const body = (await res.json().catch(() => ({}))) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || body.errors?.length || !body.data) throw new GraphQLError(body.errors?.map((e) => e.message).join('; ') || `HTTP ${res.status}`);
  return body.data;
}

/**
 * Run `handler` with a valid session. Signed-out (or expired beyond refresh) requests get
 * 401 {signedIn:false} and the cookie is cleared. A refreshed session is written back.
 */
export async function withAccount(
  request: Request,
  env: AccountEnv,
  handler: (s: Session) => Promise<Response>,
): Promise<Response> {
  if (!accountConfigured(env)) return json({ signedIn: false, available: false }, 503);
  let s = await readSession(request, env);
  if (!s) return json({ signedIn: false, available: true }, 401);
  let setCookie = '';
  if (needsRefresh(s)) {
    const t = s.rt ? await tokenRequest(env, { grant_type: 'refresh_token', refresh_token: s.rt }) : null;
    if (!t) return json({ signedIn: false, available: true }, 401, { 'Set-Cookie': clearSessionCookie() });
    s = sessionFromTokens(t, s);
    setCookie = await writeSession(env, s);
  }
  let res: Response;
  try {
    res = await handler(s);
  } catch (e) {
    if (e instanceof GraphQLError && e.message === 'unauthorized') {
      return json({ signedIn: false, available: true }, 401, { 'Set-Cookie': clearSessionCookie() });
    }
    res = json({ signedIn: true, error: 'shopify' }, 502);
  }
  if (setCookie) res.headers.append('Set-Cookie', setCookie);
  return res;
}

/** POSTs must come from a page on this site (SameSite=Lax already keeps the cookie off cross-site POSTs). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return origin !== null && origin === new URL(request.url).origin;
}

// ── queries ─────────────────────────────────────────────────────────────────

export const SUMMARY_QUERY = `query AccountSummary {
  customer {
    id
    firstName
    emailAddress { emailAddress }
    savedPatterns: metafield(namespace: "${PATTERNS_NAMESPACE}", key: "${PATTERNS_KEY}") { value }
    orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
      nodes { id name processedAt financialStatus fulfillmentStatus statusPageUrl totalPrice { amount currencyCode } }
    }
    draftOrders(first: 20, sortKey: UPDATED_AT, reverse: true) {
      nodes { id name createdAt updatedAt status invoiceUrl totalPrice { amount currencyCode } }
    }
  }
}`;

export const PATTERNS_QUERY = `query SavedPatterns {
  customer { id savedPatterns: metafield(namespace: "${PATTERNS_NAMESPACE}", key: "${PATTERNS_KEY}") { value } }
}`;

export const PATTERNS_SET = `mutation SavePatterns($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) { metafields { key } userErrors { field message } }
}`;

interface Money { amount: string; currencyCode: string }

export interface SummaryData {
  customer: {
    id: string;
    firstName: string | null;
    emailAddress: { emailAddress: string } | null;
    savedPatterns: { value: string } | null;
    orders: { nodes: { id: string; name: string; processedAt: string; financialStatus: string | null; fulfillmentStatus: string; statusPageUrl: string; totalPrice: Money }[] };
    draftOrders: { nodes: { id: string; name: string; createdAt: string; updatedAt: string; status: string; invoiceUrl: string | null; totalPrice: Money }[] };
  };
}

export interface AccountSummary {
  signedIn: true;
  email: string;
  firstName: string;
  patterns: SavedPattern[];
  quotes: { name: string; date: string; status: 'open' | 'sent' | 'completed'; total: Money; url: string | null }[];
  orders: { name: string; date: string; payment: string; fulfillment: string; total: Money; url: string }[];
}

const DRAFT_STATUS: Record<string, 'open' | 'sent' | 'completed'> = { OPEN: 'open', INVOICE_SENT: 'sent', COMPLETED: 'completed' };

export function toSummary(d: SummaryData): AccountSummary {
  const c = d.customer;
  return {
    signedIn: true,
    email: c.emailAddress?.emailAddress ?? '',
    firstName: c.firstName ?? '',
    patterns: parseSavedPatterns(c.savedPatterns?.value),
    quotes: c.draftOrders.nodes.map((q) => ({
      name: q.name,
      date: q.updatedAt || q.createdAt,
      status: DRAFT_STATUS[q.status] ?? 'open',
      total: q.totalPrice,
      // the invoice link is only useful while the quote can still be paid
      url: q.status === 'COMPLETED' ? null : q.invoiceUrl,
    })),
    orders: c.orders.nodes.map((o) => ({
      name: o.name,
      date: o.processedAt,
      payment: (o.financialStatus ?? '').toLowerCase().replace(/_/g, ' '),
      fulfillment: o.fulfillmentStatus.toLowerCase().replace(/_/g, ' '),
      total: o.totalPrice,
      url: o.statusPageUrl,
    })),
  };
}
