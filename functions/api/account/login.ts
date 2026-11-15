/**
 * GET /api/account/login?return=<path>
 * Starts sign-in with Shopify customer accounts (authorization code + PKCE, confidential client).
 * The PKCE verifier, nonce and return path travel encrypted in `state`; a 10-minute ct_login
 * cookie holds the browser binding sealed into the same state.
 */
import { CALLBACK_PATH, authorizeUrl, codeChallenge, loginCookie, newLoginState } from '../../../src/lib/account';
import { accountConfigured, type AccountEnv } from '../../../src/lib/accountApi';

export const onRequestGet: PagesFunction<AccountEnv> = async (ctx) => {
  const url = new URL(ctx.request.url);
  if (!accountConfigured(ctx.env)) return Response.redirect(new URL('/account/?error=unavailable', url).toString(), 302);
  const { state, verifier, nonce, binding } = await newLoginState(ctx.env.ACCOUNT_SESSION_SECRET, url.searchParams.get('return'));
  const target = authorizeUrl({
    clientId: ctx.env.SHOPIFY_CUSTOMER_CLIENT_ID,
    redirectUri: new URL(CALLBACK_PATH, url).toString(),
    state,
    nonce,
    challenge: await codeChallenge(verifier),
  });
  return new Response(null, { status: 302, headers: { Location: target, 'Set-Cookie': loginCookie(binding), 'Cache-Control': 'no-store' } });
};
