/**
 * GET /api/account/login?return=<path>
 * Starts sign-in with Shopify customer accounts (authorization code + PKCE, confidential client).
 * No cookie is set here: the PKCE verifier, nonce and return path travel encrypted in `state`.
 */
import { CALLBACK_PATH, authorizeUrl, codeChallenge, newLoginState } from '../../../src/lib/account';
import { accountConfigured, type AccountEnv } from '../../../src/lib/accountApi';

export const onRequestGet: PagesFunction<AccountEnv> = async (ctx) => {
  const url = new URL(ctx.request.url);
  if (!accountConfigured(ctx.env)) return Response.redirect(new URL('/account/?error=unavailable', url).toString(), 302);
  const { state, verifier, nonce } = await newLoginState(ctx.env.ACCOUNT_SESSION_SECRET, url.searchParams.get('return'));
  const target = authorizeUrl({
    clientId: ctx.env.SHOPIFY_CUSTOMER_CLIENT_ID,
    redirectUri: new URL(CALLBACK_PATH, url).toString(),
    state,
    nonce,
    challenge: await codeChallenge(verifier),
  });
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
};
