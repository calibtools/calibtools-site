/**
 * Cloudflare Pages Function: GET /q/<id>/<key>.pdf
 *
 * Quotation PDF for a custom offer. The offer data is stored encrypted in a Shopify
 * metaobject (type offer_doc, handle = id); the key is in the link and nowhere else.
 * A wrong id or key gives a plain 404. Nothing is cached and the page is not indexed.
 */
import { isOfferId, isOfferKey } from '../../../src/lib/offerCrypto';
import { offerDocument, type OfferDocEnv } from '../../../src/lib/offerDoc';
import { offerPdfName } from '../../../src/lib/offerEmail';

type Env = OfferDocEnv;

const HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};
const notFound = () => new Response('Not found', { status: 404, headers: HEADERS });
const unavailable = () => new Response('Temporarily unavailable', { status: 503, headers: HEADERS });

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const id = String(ctx.params.id ?? '');
  const file = String(ctx.params.file ?? '');
  if (!isOfferId(id) || !file.endsWith('.pdf')) return notFound();
  const key = file.slice(0, -4);
  if (!isOfferKey(key)) return notFound();

  const origin = new URL(ctx.request.url).origin;
  const doc = await offerDocument(ctx.env, origin, id, key);
  if (doc.status === 'unavailable') return unavailable();
  if (doc.status === 'not-found') return notFound();
  return new Response(doc.pdf, {
    headers: { ...HEADERS, 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${offerPdfName(doc.no)}"` },
  });
};
