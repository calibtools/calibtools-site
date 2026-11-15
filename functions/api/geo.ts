/**
 * GET /api/geo → {"country":"DE"}
 * The visitor's country as Cloudflare sees it, for the consent banner's region rule. Only the
 * two-letter code leaves the server; no IP address is read, stored or returned.
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  const raw = (ctx.request as Request & { cf?: { country?: string } }).cf?.country ?? '';
  const country = /^[A-Z]{2}$/.test(raw) ? raw : '';
  return new Response(JSON.stringify({ country }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });
};
