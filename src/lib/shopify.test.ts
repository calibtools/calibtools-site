import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatPrice, findVariant, buildCartLines, buildSetCartLine, highestEndId, sanitizeHtml, extractSpecsFromHtml, type Variant, type Cart } from './shopify';
import { dictMarkerCount } from './dicts/dicts';

describe('formatPrice', () => {
  it('EUR integer', () => expect(formatPrice('89.00', 'EUR')).toBe('€89'));
  it('EUR decimal', () => expect(formatPrice('89.50', 'EUR')).toBe('€89.50'));
  it('USD', () => expect(formatPrice('99.00', 'USD')).toBe('$99'));
  it('GBP', () => expect(formatPrice('79.99', 'GBP')).toBe('£79.99'));
  it('other currency', () => expect(formatPrice('100.00', 'JPY')).toBe('100.00 JPY'));
});

describe('findVariant', () => {
  const variants: Variant[] = [
    { id: 'v1', title: '200 × 150 / 6X6', sku: 'A', price: '€89', priceAmount: '89.00', currencyCode: 'EUR', availableForSale: true, selectedOptions: [{ name: 'Size', value: '200 × 150' }, { name: 'Dictionary', value: 'DICT_6X6_250' }] },
    { id: 'v2', title: '300 × 200 / 6X6', sku: 'B', price: '€109', priceAmount: '109.00', currencyCode: 'EUR', availableForSale: true, selectedOptions: [{ name: 'Size', value: '300 × 200' }, { name: 'Dictionary', value: 'DICT_6X6_250' }] },
    { id: 'v3', title: '200 × 150 / 5X5', sku: 'C', price: '€89', priceAmount: '89.00', currencyCode: 'EUR', availableForSale: false, selectedOptions: [{ name: 'Size', value: '200 × 150' }, { name: 'Dictionary', value: 'DICT_5X5_100' }] },
  ];

  it('finds exact match', () => {
    const v = findVariant(variants, { Size: '300 × 200', Dictionary: 'DICT_6X6_250' });
    expect(v?.id).toBe('v2');
  });

  it('returns undefined when no match', () => {
    expect(findVariant(variants, { Size: '800 × 600', Dictionary: 'DICT_6X6_250' })).toBeUndefined();
  });

  it('matches unavailable variants', () => {
    const v = findVariant(variants, { Size: '200 × 150', Dictionary: 'DICT_5X5_100' });
    expect(v?.id).toBe('v3');
    expect(v?.availableForSale).toBe(false);
  });
});

describe('buildCartLines', () => {
  it('single product, no add-ons', () => {
    const lines = buildCartLines('v1', 2, []);
    expect(lines).toEqual([{ merchandiseId: 'v1', quantity: 2 }]);
  });

  it('product + add-ons', () => {
    const lines = buildCartLines('v1', 1, ['cert-v1', 'fixture-v1']);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({ merchandiseId: 'v1', quantity: 1 });
    expect(lines[1]).toEqual({ merchandiseId: 'cert-v1', quantity: 1 });
    expect(lines[2]).toEqual({ merchandiseId: 'fixture-v1', quantity: 1 });
  });

  it('passes through line-item attributes', () => {
    const attrs = [
      { key: 'start_id', value: '0' },
      { key: 'id_range', value: '0\u201334' },
    ];
    const lines = buildCartLines('v1', 1, [], attrs);
    expect(lines).toEqual([{ merchandiseId: 'v1', quantity: 1, attributes: attrs }]);
  });
});

describe('sanitizeHtml', () => {
  it('strips script tags', () => {
    expect(sanitizeHtml('<p>Hello</p><script>alert(1)</script><p>World</p>'))
      .toBe('<p>Hello</p><p>World</p>');
  });

  it('strips nested script tags', () => {
    expect(sanitizeHtml('<script type="text/javascript">var x = 1;</script>'))
      .toBe('');
  });

  it('preserves normal HTML', () => {
    const html = '<h2>Specs</h2><table><tr><td>Material</td><td>Aluminium</td></tr></table>';
    expect(sanitizeHtml(html)).toBe(html);
  });
});

describe('extractSpecsFromHtml', () => {
  it('extracts table rows', () => {
    const html = '<table><tr><td>Substrate</td><td>Aluminium</td></tr><tr><td>Tolerance</td><td>0.3 mm</td></tr></table>';
    const specs = extractSpecsFromHtml(html);
    expect(specs).toEqual([['Substrate', 'Aluminium'], ['Tolerance', '0.3 mm']]);
  });

  it('returns null when no table', () => {
    expect(extractSpecsFromHtml('<p>No table here</p>')).toBeNull();
  });

  it('strips inner HTML tags from cells', () => {
    const html = '<table><tr><td><strong>Material</strong></td><td>6 mm <em>composite</em></td></tr></table>';
    const specs = extractSpecsFromHtml(html);
    expect(specs).toEqual([['Material', '6 mm composite']]);
  });
});

describe('cartQuery', () => {
  const mockCart = {
    id: 'gid://shopify/Cart/1',
    checkoutUrl: 'https://shop.calib.tools/cart/c/1',
    totalQuantity: 2,
    cost: { subtotalAmount: { amount: '178.00', currencyCode: 'EUR' } },
    lines: {
      nodes: [
        {
          id: 'line-1',
          quantity: 2,
          attributes: [
            { key: 'start_id', value: '0' },
            { key: 'id_range', value: '0\u201334' },
          ],
          merchandise: {
            id: 'gid://shopify/ProductVariant/v1',
            title: '200 × 150 / DICT_6X6_250',
            sku: 'CHR-200-6X6',
            product: { title: 'ChArUco calibration target', handle: 'charuco-composite' },
            price: { amount: '89.00', currencyCode: 'EUR' },
            image: { url: 'https://cdn.shopify.com/img.jpg', altText: 'ChArUco' },
          },
          cost: { totalAmount: { amount: '178.00', currencyCode: 'EUR' } },
        },
      ],
    },
  };

  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    // Set env vars so hasCredentials() returns true
    (import.meta as any).env = {
      ...(import.meta as any).env,
      PUBLIC_SHOPIFY_DOMAIN: 'shop.calib.tools',
      PUBLIC_SHOPIFY_STOREFRONT_TOKEN: 'test-token',
    };
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns mapped cart on success', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: { cart: mockCart } })));
    const { cartQuery } = await import('./shopify');
    const cart = await cartQuery('gid://shopify/Cart/1');
    expect(cart).not.toBeNull();
    expect(cart!.totalQuantity).toBe(2);
    expect(cart!.lines).toHaveLength(1);
    expect(cart!.lines[0].merchandise.sku).toBe('CHR-200-6X6');
    expect(cart!.lines[0].attributes).toEqual([
      { key: 'start_id', value: '0' },
      { key: 'id_range', value: '0\u201334' },
    ]);
    expect(cart!.cost.subtotalAmount.amount).toBe('178.00');
  });

  it('maps empty attributes when none present', async () => {
    const cartNoAttrs = {
      ...mockCart,
      lines: { nodes: [{ ...mockCart.lines.nodes[0], attributes: undefined }] },
    };
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: { cart: cartNoAttrs } })));
    const { cartQuery } = await import('./shopify');
    const cart = await cartQuery('gid://shopify/Cart/1');
    expect(cart!.lines[0].attributes).toEqual([]);
  });

  it('returns null and clears storage for expired cart', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: { cart: null } })));
    const { cartQuery } = await import('./shopify');
    const cart = await cartQuery('gid://shopify/Cart/expired');
    expect(cart).toBeNull();
  });

  it('returns null on network error', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));
    const { cartQuery } = await import('./shopify');
    const cart = await cartQuery('gid://shopify/Cart/1');
    expect(cart).toBeNull();
  });
});

describe('cartLinesUpdate', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    (import.meta as any).env = {
      ...(import.meta as any).env,
      PUBLIC_SHOPIFY_DOMAIN: 'shop.calib.tools',
      PUBLIC_SHOPIFY_STOREFRONT_TOKEN: 'test-token',
    };
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns updated cart', async () => {
    const updatedCart = {
      id: 'gid://shopify/Cart/1',
      checkoutUrl: 'https://shop.calib.tools/cart/c/1',
      totalQuantity: 3,
      cost: { subtotalAmount: { amount: '267.00', currencyCode: 'EUR' } },
      lines: { nodes: [] },
    };
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { cartLinesUpdate: { cart: updatedCart, userErrors: [] } } })),
    );
    const { cartLinesUpdate } = await import('./shopify');
    const cart = await cartLinesUpdate('gid://shopify/Cart/1', [{ id: 'line-1', quantity: 3 }]);
    expect(cart.totalQuantity).toBe(3);
  });

  it('throws on user error', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { cartLinesUpdate: { cart: null, userErrors: [{ field: 'lines', message: 'Invalid line' }] } } })),
    );
    const { cartLinesUpdate } = await import('./shopify');
    await expect(cartLinesUpdate('gid://shopify/Cart/1', [{ id: 'bad', quantity: 1 }])).rejects.toThrow('Invalid line');
  });
});

describe('cartLinesRemove', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    (import.meta as any).env = {
      ...(import.meta as any).env,
      PUBLIC_SHOPIFY_DOMAIN: 'shop.calib.tools',
      PUBLIC_SHOPIFY_STOREFRONT_TOKEN: 'test-token',
    };
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns cart with line removed', async () => {
    const updatedCart = {
      id: 'gid://shopify/Cart/1',
      checkoutUrl: 'https://shop.calib.tools/cart/c/1',
      totalQuantity: 0,
      cost: { subtotalAmount: { amount: '0.00', currencyCode: 'EUR' } },
      lines: { nodes: [] },
    };
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { cartLinesRemove: { cart: updatedCart, userErrors: [] } } })),
    );
    const { cartLinesRemove } = await import('./shopify');
    const cart = await cartLinesRemove('gid://shopify/Cart/1', ['line-1']);
    expect(cart.totalQuantity).toBe(0);
    expect(cart.lines).toHaveLength(0);
  });
});

describe('buildSetCartLine', () => {
  it('N=2, Q=1 → qty 2 with correct attributes', () => {
    const line = buildSetCartLine('v1', 2, 1, 0, ['0\u201334', '35\u201369']);
    expect(line.merchandiseId).toBe('v1');
    expect(line.quantity).toBe(2);
    expect(line.attributes).toEqual([
      { key: 'start_id', value: '0' },
      { key: 'id_range', value: '0\u201369' },
      { key: 'id_ranges', value: '0\u201334, 35\u201369' },
      { key: 'boards', value: '2' },
    ]);
  });

  it('N=4, Q=2 → qty 8', () => {
    const line = buildSetCartLine('v1', 4, 2, 0, ['0\u201334', '35\u201369', '70\u2013104', '105\u2013139']);
    expect(line.quantity).toBe(8);
    expect(line.attributes!.find(a => a.key === 'boards')!.value).toBe('8');
    expect(line.attributes!.find(a => a.key === 'id_range')!.value).toBe('0\u2013139');
  });

  it('N=1 Q=2 still works (edge case)', () => {
    const line = buildSetCartLine('v1', 1, 2, 0, ['0\u201334']);
    expect(line.quantity).toBe(2);
    expect(line.attributes!.find(a => a.key === 'id_range')!.value).toBe('0\u201334');
  });
});

describe('highestEndId', () => {
  const mkCart = (lines: Cart['lines']): Cart => ({
    id: 'c1', checkoutUrl: '', totalQuantity: 0,
    cost: { subtotalAmount: { amount: '0', currencyCode: 'USD' } },
    lines,
  });
  const mkLine = (vid: string, attrs: Array<{ key: string; value: string }>) => ({
    id: 'l1', quantity: 1, attributes: attrs,
    merchandise: { id: vid, title: '', sku: '', product: { title: '', handle: '' }, price: { amount: '0', currencyCode: 'USD' }, image: null },
    cost: { totalAmount: { amount: '0', currencyCode: 'USD' } },
  });

  it('returns -1 for null cart', () => {
    expect(highestEndId(null, 'v1')).toBe(-1);
  });

  it('returns -1 when no set lines for variant', () => {
    expect(highestEndId(mkCart([mkLine('v1', [])]), 'v1')).toBe(-1);
  });

  it('finds highest end from id_range attribute', () => {
    const cart = mkCart([
      mkLine('v1', [{ key: 'id_range', value: '0\u201369' }]),
      mkLine('v1', [{ key: 'id_range', value: '70\u2013139' }]),
    ]);
    expect(highestEndId(cart, 'v1')).toBe(139);
  });

  it('ignores lines for different variants', () => {
    const cart = mkCart([mkLine('v2', [{ key: 'id_range', value: '0\u201369' }])]);
    expect(highestEndId(cart, 'v1')).toBe(-1);
  });
});

describe('dictMarkerCount overflow', () => {
  it('DICT_6X6_250 has 250 markers', () => {
    expect(dictMarkerCount('DICT_6X6_250')).toBe(250);
  });

  it('DICT_4X4_50 has 50 markers', () => {
    expect(dictMarkerCount('DICT_4X4_50')).toBe(50);
  });

  it('unknown dict returns null', () => {
    expect(dictMarkerCount('DICT_UNKNOWN')).toBeNull();
  });
});

describe('fallback behaviour', () => {
  it('getProducts returns fallback products (no env)', async () => {
    // import.meta.env won't have real values in test
    const { getProducts } = await import('./shopify');
    const products = await getProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].handle).toBeTruthy();
    expect(products[0].url).toMatch(/^\/targets\//);
  });

  it('getCollections returns fallback collections (no env)', async () => {
    const { getCollections } = await import('./shopify');
    const collections = await getCollections();
    expect(collections.length).toBe(4);
    expect(collections[0].handle).toBe('composite-boards');
  });

  it('getProductByHandle returns fallback product (no env)', async () => {
    const { getProductByHandle } = await import('./shopify');
    const p = await getProductByHandle('charuco-composite');
    expect(p).not.toBeNull();
    expect(p!.title).toContain('ChArUco');
  });

  it('getProductByHandle returns null for unknown handle', async () => {
    const { getProductByHandle } = await import('./shopify');
    const p = await getProductByHandle('nonexistent-product');
    expect(p).toBeNull();
  });
});
