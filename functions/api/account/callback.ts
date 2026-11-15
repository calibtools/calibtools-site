/**
 * GET /api/account/callback?code=…&state=…
 * Shopify sends the customer back here after sign-in. Exchanges the code for tokens and sets
 * the one session cookie (HttpOnly, first-party), then lands on the page sign-in started from.
 */
import { CALLBACK_PATH, LOGIN_COOKIE, checkLoginState, clearLoginCookie, idTokenClaims, readCookie, sessionFromTokens } from '../../../src/lib/account';
import { accountConfigured, tokenExchange, writeSession, type AccountEnv } from '../../../src/lib/accountApi';

export const onRequestGet: PagesFunction<AccountEnv> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const fail = (reason: string) => {
    const h = new Headers({ Location: `/account/?error=${reason}`, 'Cache-Control': 'no-store' });
    h.append('Set-Cookie', clearLoginCookie());
    return new Response(null, { status: 302, headers: h });
  };
  if (!accountConfigured(ctx.env)) return fail('unavailable');
  if (url.searchParams.get('error')) return fail('cancelled');

  const code = url.searchParams.get('code') ?? '';
  const binding = readCookie(ctx.request.headers.get('Cookie'), LOGIN_COOKIE);
  const login = await checkLoginState(ctx.env.ACCOUNT_SESSION_SECRET, url.searchParams.get('state') ?? '', binding);
  if (!code || !login) return fail('expired');

  const result = await tokenExchange(ctx.env, {
    grant_type: 'authorization_code',
    client_id: ctx.env.SHOPIFY_CUSTOMER_CLIENT_ID,
    redirect_uri: new URL(CALLBACK_PATH, url).toString(),
    code,
    code_verifier: login.v,
  });
  // Each failure has its own code, shown on /account/ and logged, so a failed sign-in can be traced.
  const log = (step: string, extra: Record<string, unknown> = {}) => console.log(JSON.stringify({ at: 'account.callback', step, ...extra }));
  if (!result.ok) {
    log('token', { status: result.status, error: result.error, description: result.description });
    return fail(`token&detail=${result.status}_${result.error}`);
  }
  const tokens = result.tokens;
  if (!tokens.id_token) {
    log('idtoken', { fields: Object.keys(tokens).sort() });
    return fail('idtoken');
  }
  const claims = idTokenClaims(tokens.id_token);
  if (claims.nonce !== login.n) {
    log('nonce', { claims: Object.keys(claims).sort(), hasNonce: typeof claims.nonce === 'string' });
    return fail(typeof claims.nonce === 'string' ? 'nonce' : 'nonce&detail=absent');
  }

  const cookie = await writeSession(ctx.env, sessionFromTokens(tokens));
  const h = new Headers({ Location: login.r, 'Cache-Control': 'no-store' });
  h.append('Set-Cookie', cookie);
  h.append('Set-Cookie', clearLoginCookie());
  return new Response(null, { status: 302, headers: h });
};
