/**
 * Reads a custom offer from its Shopify metaobject and draws the quotation PDF.
 * Shared by the PDF link (/q/<id>/<key>.pdf) and the offer email, which attaches the same PDF.
 */
import { decryptOffer } from './offerCrypto';
import { offerPdf, offerProblem, type OfferData } from './offerPdf';

export interface OfferDocEnv {
  PUBLIC_SHOPIFY_DOMAIN?: string;
  PUBLIC_SHOPIFY_STOREFRONT_TOKEN?: string;
  /** Static assets of the site (Pages binding): the PDF fonts and the Storefront settings file. */
  ASSETS?: { fetch: (input: Request | string) => Promise<Response> };
}

export type OfferDocResult =
  | { status: 'ok'; pdf: Uint8Array; no: string }
  | { status: 'not-found' }
  | { status: 'unavailable' };

const QUERY = `query($handle: String!) { metaobject(handle: { type: "offer_doc", handle: $handle }) { field(key: "payload") { value } } }`;

async function storefrontConfig(env: OfferDocEnv, origin: string): Promise<{ domain: string; token: string } | null> {
  if (env.PUBLIC_SHOPIFY_DOMAIN && env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN) {
    return { domain: env.PUBLIC_SHOPIFY_DOMAIN, token: env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN };
  }
  if (!env.ASSETS) return null;
  const res = await env.ASSETS.fetch(`${origin}/offer-config.json`);
  if (!res.ok) return null;
  const cfg = (await res.json()) as { domain?: string; token?: string };
  return cfg.domain && cfg.token ? { domain: cfg.domain, token: cfg.token } : null;
}

/** `id` and `key` must already have passed isOfferId / isOfferKey. A wrong id or key is 'not-found'. */
export async function offerDocument(env: OfferDocEnv, origin: string, id: string, key: string): Promise<OfferDocResult> {
  const cfg = await storefrontConfig(env, origin);
  if (!cfg || !env.ASSETS) return { status: 'unavailable' };

  const sf = await fetch(`https://${cfg.domain}/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': cfg.token },
    body: JSON.stringify({ query: QUERY, variables: { handle: id } }),
  });
  if (!sf.ok) return { status: 'unavailable' };
  const payload = ((await sf.json()) as any)?.data?.metaobject?.field?.value;
  if (typeof payload !== 'string') return { status: 'not-found' };

  const json = await decryptOffer(payload, key);
  if (json === null) return { status: 'not-found' };
  let data: OfferData;
  try {
    data = JSON.parse(json);
  } catch {
    return { status: 'not-found' };
  }
  if (offerProblem(data)) return { status: 'not-found' };

  const load = async (name: string) => {
    const res = await env.ASSETS!.fetch(`${origin}/fonts/pdf/${name}`);
    if (!res.ok) throw new Error(`font ${name}: ${res.status}`);
    return res.arrayBuffer();
  };
  const [regular, semiBold, mono] = await Promise.all([load('Geist-Regular.ttf'), load('Geist-SemiBold.ttf'), load('GeistMono-Regular.ttf')]);
  return { status: 'ok', pdf: await offerPdf(data, { regular, semiBold, mono }), no: data.no };
}
