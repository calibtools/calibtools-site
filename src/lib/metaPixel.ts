/**
 * Meta Pixel: the start-up call and the three shop events.
 * The pixel is a marketing tag like the others: src/lib/tags.ts decides whether it loads and the consent
 * banner starts it (src/components/ConsentBanner.astro). Nothing here loads a script or contacts Meta.
 * Until the banner has started the pixel, events wait in the page's memory; if marketing is off they are
 * never sent. Events carry Shopify variant numbers, amounts and a currency code only: no names, email
 * addresses, phone numbers or addresses. Advanced matching and the Conversions API are not used.
 */
export type MetaEvent = 'ViewContent' | 'AddToCart' | 'InitiateCheckout';
type Params = Record<string, string | number | string[]>;

interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
}
export interface MetaWindow { fbq?: Fbq; _fbq?: Fbq; __ctMetaWaiting?: Array<[MetaEvent, Params]> }

const WAITING_MAX = 20;

/**
 * Meta's standard start-up, without the script tag (the banner adds that): automatic events off, so only
 * the events named in this file are sent; `init` with the ID alone, so no visitor data is matched.
 */
export function startMetaPixel(w: MetaWindow, id: string): void {
  if (w.fbq) return;
  const fbq = function () {
    // Meta's script expects the arguments object itself
    // eslint-disable-next-line prefer-rest-params
    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments as unknown as unknown[]); else fbq.queue.push(arguments);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;
  fbq('set', 'autoConfig', false, id);
  fbq('init', id);
  fbq('track', 'PageView');
  for (const [event, params] of w.__ctMetaWaiting ?? []) fbq('track', event, params);
  w.__ctMetaWaiting = [];
}

export function trackMeta(event: MetaEvent, params: Params | null, w: MetaWindow | undefined = typeof window === 'undefined' ? undefined : (window as MetaWindow)): void {
  if (!params || !w) return;
  try {
    if (w.fbq) w.fbq('track', event, params);
    else if ((w.__ctMetaWaiting ??= []).length < WAITING_MAX) w.__ctMetaWaiting.push([event, params]);
  } catch {
    // marketing tags must never break the page
  }
}

/** 'gid://shopify/ProductVariant/123' → '123', the item ID a Shopify-fed Meta catalog uses. */
export function variantNumber(gid: string): string {
  return gid.slice(gid.lastIndexOf('/') + 1).split('?')[0];
}

const amount = (v: string | number) => Math.round(Number(v) * 100) / 100;

type Money = { amount: string; currencyCode: string };

export function viewContentParams(v: { id: string; priceAmount: string; currencyCode: string }): Params {
  return { content_ids: [variantNumber(v.id)], content_type: 'product', value: amount(v.priceAmount), currency: v.currencyCode };
}

/** Value of the lines just added, at the prices in the cart Shopify returned. Null when a price is missing. */
export function addToCartParams(
  added: Array<{ merchandiseId: string; quantity?: number }>,
  cartLines: Array<{ merchandise?: { id?: string; price?: Money } | null }> | undefined,
): Params | null {
  if (!cartLines || added.length === 0) return null;
  let value = 0;
  let currency = '';
  const ids: string[] = [];
  for (const line of added) {
    const price = cartLines.find((l) => l.merchandise?.id === line.merchandiseId)?.merchandise?.price;
    if (!price) return null;
    value += Number(price.amount) * (line.quantity ?? 1);
    currency = price.currencyCode;
    const id = variantNumber(line.merchandiseId);
    if (!ids.includes(id)) ids.push(id);
  }
  return { content_ids: ids, content_type: 'product', value: amount(value), currency };
}

export function checkoutParams(cart: { totalQuantity: number; cost: { subtotalAmount: Money } } | null | undefined): Params | null {
  if (!cart?.cost?.subtotalAmount) return null;
  return { value: amount(cart.cost.subtotalAmount.amount), currency: cart.cost.subtotalAmount.currencyCode, num_items: cart.totalQuantity };
}
