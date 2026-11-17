import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanTagIds, tagsToLoad, cookiesToDrop, TAG_LABELS } from './tags';
import { defaultChoice, effectiveChoice, parseChoice, serializeChoice } from './consent';
import {
  startMetaPixel, trackMeta, variantNumber, viewContentParams, addToCartParams, checkoutParams, type MetaWindow,
} from './metaPixel';
import { cartCreate, cartLinesAdd } from './shopify';

const ID = '123456789012345';
const ids = cleanTagIds({ meta: ID });
const calls = (w: MetaWindow) => (w.fbq?.queue ?? []).map((a) => Array.from(a as ArrayLike<unknown>));

/** The choice as the banner reads it: from the stored string, through the same functions. */
const stored = (analytics: boolean, marketing: boolean, gpc = false) =>
  effectiveChoice(parseChoice(serializeChoice({ v: 1, analytics, marketing, t: 1 })), gpc);

describe('Meta Pixel: when it loads', () => {
  it('is a marketing tag with a numeric ID and Meta\'s script address', () => {
    expect(ids).toEqual({ meta: ID });
    expect(cleanTagIds({ meta: 'abc' })).toEqual({});
    expect(cleanTagIds({ meta: '123' })).toEqual({});
    expect(TAG_LABELS.meta).toBe('Meta Pixel');
    expect(tagsToLoad(ids, stored(true, true))).toEqual([{ key: 'meta', id: ID, src: 'https://connect.facebook.net/en_US/fbevents.js' }]);
  });

  it('follows the site rule: on by default, off when marketing is switched off or the browser sends GPC', () => {
    expect(tagsToLoad(ids, effectiveChoice(null, false)).map((t) => t.key)).toEqual(['meta']);
    expect(tagsToLoad(ids, defaultChoice(true))).toEqual([]);
    expect(tagsToLoad(ids, stored(true, false))).toEqual([]);
    expect(tagsToLoad(ids, stored(false, false))).toEqual([]);
    expect(tagsToLoad(ids, stored(true, true, true))).toEqual([]);
    expect(tagsToLoad(ids, stored(false, true)).map((t) => t.key)).toEqual(['meta']);
  });

  it('removes Meta\'s cookies once marketing is off', () => {
    const names = ['_fbp', '_fbc', '_ga', 'ct_other'];
    expect(cookiesToDrop(names, stored(true, false))).toEqual(['_fbp', '_fbc']);
    expect(cookiesToDrop(names, stored(true, true))).toEqual([]);
  });
});

describe('Meta Pixel: what is sent', () => {
  it('starts with automatic events off, the ID only (no visitor data) and one PageView', () => {
    const w: MetaWindow = {};
    startMetaPixel(w, ID);
    expect(calls(w)).toEqual([['set', 'autoConfig', false, ID], ['init', ID], ['track', 'PageView']]);
    startMetaPixel(w, ID);
    expect(calls(w)).toHaveLength(3);
  });

  it('sends nothing before the pixel has started, and hands over what happened on the page when it starts', () => {
    const w: MetaWindow = {};
    trackMeta('ViewContent', { content_ids: ['1'], content_type: 'product', value: 1, currency: 'EUR' }, w);
    expect(w.fbq).toBeUndefined();
    startMetaPixel(w, ID);
    expect(calls(w).map((c) => c[1])).toEqual(['autoConfig', ID, 'PageView', 'ViewContent']);
    trackMeta('InitiateCheckout', { value: 2, currency: 'EUR', num_items: 1 }, w);
    expect(calls(w).at(-1)).toEqual(['track', 'InitiateCheckout', { value: 2, currency: 'EUR', num_items: 1 }]);
  });

  it('skips an event without parameters', () => {
    const w: MetaWindow = {};
    startMetaPixel(w, ID);
    trackMeta('AddToCart', null, w);
    expect(calls(w)).toHaveLength(3);
  });

  it('ViewContent: the Shopify variant number, price and currency of the variant shown', () => {
    expect(variantNumber('gid://shopify/ProductVariant/52577923432760')).toBe('52577923432760');
    expect(viewContentParams({ id: 'gid://shopify/ProductVariant/111', priceAmount: '148.0', currencyCode: 'EUR' }))
      .toEqual({ content_ids: ['111'], content_type: 'product', value: 148, currency: 'EUR' });
  });

  it('AddToCart: the lines just added, priced from the cart Shopify returned', () => {
    const cartLines = [
      { quantity: 5, merchandise: { id: 'gid://shopify/ProductVariant/111', price: { amount: '148.0', currencyCode: 'USD' } } },
      { quantity: 2, merchandise: { id: 'gid://shopify/ProductVariant/222', price: { amount: '19.5', currencyCode: 'USD' } } },
      { quantity: 1, merchandise: { id: 'gid://shopify/ProductVariant/333', price: { amount: '900.0', currencyCode: 'USD' } } },
    ];
    const added = [{ merchandiseId: 'gid://shopify/ProductVariant/111', quantity: 2 }, { merchandiseId: 'gid://shopify/ProductVariant/222', quantity: 2 }];
    expect(addToCartParams(added, cartLines)).toEqual({ content_ids: ['111', '222'], content_type: 'product', value: 335, currency: 'USD' });
    expect(addToCartParams([{ merchandiseId: 'gid://shopify/ProductVariant/999', quantity: 1 }], cartLines)).toBeNull();
    expect(addToCartParams(added, undefined)).toBeNull();
  });

  it('InitiateCheckout: cart subtotal, currency and number of items', () => {
    expect(checkoutParams({ totalQuantity: 3, cost: { subtotalAmount: { amount: '316.50', currencyCode: 'EUR' } } }))
      .toEqual({ value: 316.5, currency: 'EUR', num_items: 3 });
    expect(checkoutParams(null)).toBeNull();
  });

  it('never carries personal data: only IDs, numbers and a currency code', () => {
    const all = [
      viewContentParams({ id: 'gid://shopify/ProductVariant/111', priceAmount: '1', currencyCode: 'EUR' }),
      checkoutParams({ totalQuantity: 1, cost: { subtotalAmount: { amount: '1', currencyCode: 'EUR' } } }),
    ];
    for (const p of all) expect(Object.keys(p!).sort().join()).toMatch(/^(content_ids,content_type,currency,value|currency,num_items,value)$/);
  });
});

describe('Meta Pixel: add to cart through the real cart calls', () => {
  const cart = {
    id: 'gid://shopify/Cart/c1', checkoutUrl: 'https://shop.calib.tools/cart/c/c1', totalQuantity: 3,
    cost: { subtotalAmount: { amount: '316.0', currencyCode: 'EUR' } },
    lines: { nodes: [
      { quantity: 2, merchandise: { id: 'gid://shopify/ProductVariant/111', price: { amount: '148.0', currencyCode: 'EUR' } } },
      { quantity: 1, merchandise: { id: 'gid://shopify/ProductVariant/222', price: { amount: '20.0', currencyCode: 'EUR' } } },
    ] },
  };
  const added = [{ merchandiseId: 'gid://shopify/ProductVariant/111', quantity: 2 }];
  let fetchSpy: any;
  let w: MetaWindow;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    w = {};
    vi.stubGlobal('window', w);
  });
  afterEach(() => { fetchSpy.mockRestore(); vi.unstubAllGlobals(); });

  it('cartCreate reports AddToCart and returns the totals used for InitiateCheckout', async () => {
    startMetaPixel(w, ID);
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: { cartCreate: { cart, userErrors: [] } } })));
    const result = await cartCreate(added);
    expect(calls(w).at(-1)).toEqual(['track', 'AddToCart', { content_ids: ['111'], content_type: 'product', value: 296, currency: 'EUR' }]);
    expect(checkoutParams(result.totals)).toEqual({ value: 316, currency: 'EUR', num_items: 3 });
    expect(String(fetchSpy.mock.calls[0][1].body)).toContain('subtotalAmount');
  });

  it('cartLinesAdd reports AddToCart; with marketing off nothing reaches Meta', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: { cartLinesAdd: { cart, userErrors: [] } } })));
    const result = await cartLinesAdd('gid://shopify/Cart/c1', added);
    expect(w.fbq).toBeUndefined();
    expect(w.__ctMetaWaiting).toEqual([['AddToCart', { content_ids: ['111'], content_type: 'product', value: 296, currency: 'EUR' }]]);
    expect(result.totals.totalQuantity).toBe(3);
  });
});
