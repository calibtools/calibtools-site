/**
 * Cloudflare Pages Function: GET /api/health
 *
 * Says whether the site can still reach the Shopify Admin API with its app credentials: it gets an access
 * token and asks for the shop's name. Nothing is created or changed, and nothing about the shop is returned.
 * The sign-up forms depend on this; a daily workflow (.github/workflows/health.yml) calls it so a broken
 * credential or an uninstalled app is noticed before a visitor finds it.
 *
 * Answers { ok: true } or { ok: false, code }, with the same codes as /api/subscribe:
 *   S0 settings missing · S1-<HTTP status> access token refused · S2 Admin API query failed.
 * Shopify's own error name goes to the log only.
 */
import { adminFetch, AdminTokenError } from '../../src/lib/shopifyAdmin';

interface Env {
  SHOPIFY_CLIENT_ID?: string;
  SHOPIFY_CLIENT_SECRET?: string;
  SHOPIFY_STORE_DOMAIN?: string;
  QUOTES?: KVNamespace;
  WEBHOOKS?: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const answer = (body: { ok: boolean; code?: string }, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

  const env = ctx.env;
  if (!env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET || !env.SHOPIFY_STORE_DOMAIN) {
    console.error('[health] S0: Shopify settings missing');
    return answer({ ok: false, code: 'S0' }, 503);
  }
  try {
    const data = await adminFetch(env, 'query Health { shop { name } }');
    if (!data?.shop?.name) throw new Error('no shop in the answer');
    return answer({ ok: true }, 200);
  } catch (err) {
    const code = err instanceof AdminTokenError ? `S1-${err.status}` : 'S2';
    console.error(`[health] ${code}: ${err instanceof Error ? err.message : String(err)}`);
    return answer({ ok: false, code }, 503);
  }
};
