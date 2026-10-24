/**
 * Shopify Admin API client using client-credentials OAuth.
 *
 * Server-only — used by Cloudflare Pages Functions.
 * Tokens are cached in KV (if bound) with an in-memory fallback.
 */

interface Env {
  SHOPIFY_CLIENT_ID?: string;
  SHOPIFY_CLIENT_SECRET?: string;
  SHOPIFY_STORE_DOMAIN?: string;
  /** Any bound KV namespace — used for token caching. */
  WEBHOOKS?: KVNamespace;
  QUOTES?: KVNamespace;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

const KV_KEY = 'shopify_admin_token';
const EXPIRY_BUFFER_S = 300;

// In-memory fallback when KV is unbound
let memToken: string | null = null;
let memExpiry = 0;

/** Visible for testing. */
export function _resetMemCache(): void {
  memToken = null;
  memExpiry = 0;
}

function kv(env: Env): KVNamespace | undefined {
  return env.WEBHOOKS ?? env.QUOTES;
}

async function fetchToken(domain: string, clientId: string, clientSecret: string): Promise<TokenResponse> {
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<TokenResponse>;
}

/**
 * Obtain a valid Admin API access token, caching in KV or memory.
 */
export async function getAdminToken(env: Env): Promise<string> {
  const domain = env.SHOPIFY_STORE_DOMAIN;
  const clientId = env.SHOPIFY_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET;
  if (!domain || !clientId || !clientSecret) {
    throw new Error('Missing SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, or SHOPIFY_CLIENT_SECRET');
  }

  // Try KV cache
  const ns = kv(env);
  if (ns) {
    const cached = await ns.get(KV_KEY);
    if (cached) return cached;
  }

  // Try memory cache
  if (memToken && Date.now() < memExpiry) {
    return memToken;
  }

  // Mint a new token
  const { access_token, expires_in } = await fetchToken(domain, clientId, clientSecret);
  const ttl = Math.max(expires_in - EXPIRY_BUFFER_S, 60);

  // Store in KV
  if (ns) {
    await ns.put(KV_KEY, access_token, { expirationTtl: ttl });
  }

  // Store in memory
  memToken = access_token;
  memExpiry = Date.now() + ttl * 1000;

  return access_token;
}

async function clearCache(env: Env): Promise<void> {
  memToken = null;
  memExpiry = 0;
  const ns = kv(env);
  if (ns) {
    await ns.delete(KV_KEY);
  }
}

/**
 * Execute an Admin API GraphQL query, retrying once on 401 after refreshing the token.
 */
export async function adminFetch(
  env: Env,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<any> {
  const domain = env.SHOPIFY_STORE_DOMAIN!;
  const token = await getAdminToken(env);
  const url = `https://${domain}/admin/api/2025-07/graphql.json`;

  const doFetch = async (t: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': t,
      },
      body: JSON.stringify({ query, variables }),
    });
    return res;
  };

  let res = await doFetch(token);

  // Retry once on 401
  if (res.status === 401) {
    await clearCache(env);
    const freshToken = await getAdminToken(env);
    res = await doFetch(freshToken);
  }

  if (!res.ok) throw new Error(`Admin API ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}
