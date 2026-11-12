/**
 * Cloudflare Pages Function: GET /q/<id>/<key>.pdf
 *
 * Quotation PDF for a custom offer. The offer data is stored encrypted in a Shopify
 * metaobject (type offer_doc, handle = id); the key is in the link and nowhere else.
 * A wrong id or key gives a plain 404. Nothing is cached and the page is not indexed.
 */
import { decryptOffer, isOfferId, isOfferKey } from '../../../src/lib/offerCrypto';
import { offerPdf, offerProblem, type OfferData } from '../../../src/lib/offerPdf';

interface Env {
  PUBLIC_SHOPIFY_DOMAIN?: string;
  PUBLIC_SHOPIFY_STOREFRONT_TOKEN?: string;
  ASSETS?: { fetch: (input: Request | string) => Promise<Response> };
}

const HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};
const notFound = () => new Response('Not found', { status: 404, headers: HEADERS });
const unavailable = () => new Response('Temporarily unavailable', { status: 503, headers: HEADERS });

const QUERY = `query($handle: String!) { metaobject(handle: { type: "offer_doc", handle: $handle }) { field(key: "payload") { value } } }`;

async function storefrontConfig(env: Env, origin: string): Promise<{ domain: string; token: string } | null> {
  if (env.PUBLIC_SHOPIFY_DOMAIN && env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN) {
    return { domain: env.PUBLIC_SHOPIFY_DOMAIN, token: env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN };
  }
  if (!env.ASSETS) return null;
  const res = await env.ASSETS.fetch(`${origin}/offer-config.json`);
  if (!res.ok) return null;
  const cfg = (await res.json()) as { domain?: string; token?: string };
  return cfg.domain && cfg.token ? { domain: cfg.domain, token: cfg.token } : null;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const id = String(ctx.params.id ?? '');
  const file = String(ctx.params.file ?? '');
  if (!isOfferId(id) || !file.endsWith('.pdf')) return notFound();
  const key = file.slice(0, -4);
  if (!isOfferKey(key)) return notFound();

  const origin = new URL(ctx.request.url).origin;
  const cfg = await storefrontConfig(ctx.env, origin);
  if (!cfg || !ctx.env.ASSETS) return unavailable();

  const sf = await fetch(`https://${cfg.domain}/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': cfg.token },
    body: JSON.stringify({ query: QUERY, variables: { handle: id } }),
  });
  if (!sf.ok) return unavailable();
  const payload = ((await sf.json()) as any)?.data?.metaobject?.field?.value;
  if (typeof payload !== 'string') return notFound();

  const json = await decryptOffer(payload, key);
  if (json === null) return notFound();
  let data: OfferData;
  try {
    data = JSON.parse(json);
  } catch {
    return notFound();
  }
  if (offerProblem(data)) return notFound();

  const load = async (name: string) => {
    const res = await ctx.env.ASSETS!.fetch(`${origin}/fonts/pdf/${name}`);
    if (!res.ok) throw new Error(`font ${name}: ${res.status}`);
    return res.arrayBuffer();
  };
  const [regular, semiBold, mono] = await Promise.all([load('Geist-Regular.ttf'), load('Geist-SemiBold.ttf'), load('GeistMono-Regular.ttf')]);
  const pdf = await offerPdf(data, { regular, semiBold, mono });
  const name = `Quotation-${data.no.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
  return new Response(pdf, {
    headers: { ...HEADERS, 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${name}"` },
  });
};
