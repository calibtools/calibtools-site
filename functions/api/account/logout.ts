/**
 * GET /api/account/logout
 * Clears the session cookie and ends the Shopify session, then returns to the home page.
 */
import { clearSessionCookie, logoutUrl } from '../../../src/lib/account';
import { accountConfigured, readSession, type AccountEnv } from '../../../src/lib/accountApi';

export const onRequestGet: PagesFunction<AccountEnv> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const home = new URL('/', url).toString();
  const s = accountConfigured(ctx.env) ? await readSession(ctx.request, ctx.env) : null;
  const location = s?.id ? logoutUrl(s.id, home) : home;
  return new Response(null, { status: 302, headers: { Location: location, 'Set-Cookie': clearSessionCookie(), 'Cache-Control': 'no-store' } });
};
