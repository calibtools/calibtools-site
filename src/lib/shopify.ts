/**
 * Shopify Storefront API client (API version 2025-07).
 * Build-time: getProducts, getProductByHandle, getCollections, getCollectionProducts.
 * Client-side: cartCreate, cartLinesAdd, customerCreate.
 * Falls back to static data when env vars are missing so builds never fail.
 */

// --- Config ---

const domain = import.meta.env.PUBLIC_SHOPIFY_DOMAIN ?? '';
const token = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN ?? '';

function hasCredentials(): boolean {
  return !!domain && !!token && token !== 'replace-me';
}

// --- Types ---

export interface Product {
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  priceFrom: string;
  /** Raw min price amount for JSON-LD (e.g. "89.00"). */
  priceMinAmount: string;
  /** ISO 4217 currency code (e.g. "EUR"). */
  priceMinCurrency: string;
  image?: string;
  images: Array<{ url: string; altText: string | null }>;
  options: Array<{ name: string; values: string[] }>;
  variants: Variant[];
  metafields: Record<string, string>;
  url: string;
}

export interface Variant {
  id: string;
  title: string;
  sku: string;
  price: string;
  /** Raw numeric price (e.g. "89.00") for JSON-LD. */
  priceAmount: string;
  currencyCode: string;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface Collection {
  handle: string;
  title: string;
  description: string;
  image?: string;
  products: Product[];
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
  attributes?: Array<{ key: string; value: string }>;
}

/** A line item returned from a cart query. */
export interface CartLineItem {
  id: string;
  quantity: number;
  attributes: Array<{ key: string; value: string }>;
  merchandise: {
    id: string;
    title: string;
    sku: string;
    product: { title: string; handle: string };
    price: { amount: string; currencyCode: string };
    image: { url: string; altText: string | null } | null;
  };
  cost: { totalAmount: { amount: string; currencyCode: string } };
}

/** Full cart object returned by cartQuery. */
export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: { amount: string; currencyCode: string } };
  lines: CartLineItem[];
}

// --- GraphQL helper ---

export async function storefront<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const res = await fetch(`https://${domain}/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Storefront API ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

// --- Fragments ---

const PRODUCT_FIELDS = `
  fragment ProductFields on Product {
    handle title description descriptionHtml
    priceRange { minVariantPrice { amount currencyCode } }
    featuredImage { url altText }
    images(first: 8) { nodes { url altText } }
    options { name values }
    variants(first: 100) {
      nodes {
        id title sku availableForSale
        price { amount currencyCode }
        selectedOptions { name value }
      }
    }
    metafields(identifiers: [
      { namespace: "specs", key: "material" },
      { namespace: "specs", key: "thickness_mm" },
      { namespace: "specs", key: "size_mm" },
      { namespace: "specs", key: "pattern" },
      { namespace: "specs", key: "squares" },
      { namespace: "specs", key: "square_size_mm" },
      { namespace: "specs", key: "marker_size_mm" },
      { namespace: "specs", key: "dictionary" },
      { namespace: "specs", key: "start_id" },
      { namespace: "specs", key: "feature_tolerance" },
      { namespace: "specs", key: "flatness" },
      { namespace: "specs", key: "cte" },
      { namespace: "specs", key: "operating_temp" },
      { namespace: "specs", key: "weight_g" },
      { namespace: "specs", key: "finish" },
      { namespace: "specs", key: "corner_radius_mm" },
      { namespace: "specs", key: "lead_time" },
      { namespace: "specs", key: "files_included" },
      { namespace: "specs", key: "datasheet_url" },
      { namespace: "specs", key: "datasheet_rev" },
      { namespace: "specs", key: "hs_code" },
      { namespace: "specs", key: "origin" }
    ]) { key value }
  }
`;

// --- Mappers ---

export function formatPrice(amount: string, currencyCode: string): string {
  const n = Number(amount);
  if (currencyCode === 'EUR') return `€${Number.isInteger(n) ? n : n.toFixed(2)}`;
  if (currencyCode === 'USD') return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
  if (currencyCode === 'GBP') return `£${Number.isInteger(n) ? n : n.toFixed(2)}`;
  return `${n.toFixed(2)} ${currencyCode}`;
}

function mapProduct(n: any): Product {
  const minPrice = n.priceRange.minVariantPrice;
  return {
    handle: n.handle,
    title: n.title,
    description: n.description,
    descriptionHtml: n.descriptionHtml ?? '',
    priceFrom: formatPrice(minPrice.amount, minPrice.currencyCode),
    priceMinAmount: minPrice.amount,
    priceMinCurrency: minPrice.currencyCode,
    image: n.featuredImage?.url,
    images: (n.images?.nodes ?? []).map((img: any) => ({ url: img.url, altText: img.altText })),
    options: (n.options ?? []).map((o: any) => ({ name: o.name, values: o.values })),
    variants: (n.variants?.nodes ?? []).map((v: any) => ({
      id: v.id,
      title: v.title,
      sku: v.sku ?? '',
      price: formatPrice(v.price.amount, v.price.currencyCode),
      priceAmount: v.price.amount,
      currencyCode: v.price.currencyCode,
      availableForSale: v.availableForSale,
      selectedOptions: v.selectedOptions ?? [],
    })),
    metafields: Object.fromEntries(
      (n.metafields ?? []).filter(Boolean).map((m: any) => [m.key, m.value]),
    ),
    url: `/targets/${n.handle}/`,
  };
}

// --- Queries ---

export async function getProducts(first = 50): Promise<Product[]> {
  if (!hasCredentials()) {
    console.warn('\n⚠️  USING FALLBACK DATA — no Storefront credentials. Variants will be empty, cart will be disabled.\n');
    return FALLBACK_PRODUCTS;
  }
  try {
    const data = await storefront(`
      ${PRODUCT_FIELDS}
      query Products($first: Int!) {
        products(first: $first) { nodes { ...ProductFields } }
      }
    `, { first });
    return data.products.nodes.map(mapProduct);
  } catch {
    console.warn('\n⚠️  USING FALLBACK DATA — Storefront API query failed. No variants, cart will be disabled.\n');
    return FALLBACK_PRODUCTS;
  }
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  if (!hasCredentials()) {
    console.warn('\n⚠️  USING FALLBACK DATA — no Storefront credentials. No variants, cart will be disabled.\n');
    return FALLBACK_PRODUCTS.find((p) => p.handle === handle) ?? null;
  }
  try {
    const data = await storefront(`
      ${PRODUCT_FIELDS}
      query ProductByHandle($handle: String!) {
        product(handle: $handle) { ...ProductFields }
      }
    `, { handle });
    return data.product ? mapProduct(data.product) : null;
  } catch {
    console.warn(`\n⚠️  USING FALLBACK DATA — Storefront API query failed for "${handle}". No variants, cart will be disabled.\n`);
    return FALLBACK_PRODUCTS.find((p) => p.handle === handle) ?? null;
  }
}

export async function getCollections(): Promise<Collection[]> {
  if (!hasCredentials()) return FALLBACK_COLLECTIONS;
  try {
    const data = await storefront(`
      ${PRODUCT_FIELDS}
      query Collections {
        collections(first: 20) {
          nodes {
            handle title description
            image { url altText }
            products(first: 50) { nodes { ...ProductFields } }
          }
        }
      }
    `);
    return data.collections.nodes.map((c: any) => ({
      handle: c.handle,
      title: c.title,
      description: c.description,
      image: c.image?.url,
      products: c.products.nodes.map(mapProduct),
    }));
  } catch {
    return FALLBACK_COLLECTIONS;
  }
}

export async function getCollectionProducts(handle: string): Promise<Collection | null> {
  if (!hasCredentials()) return FALLBACK_COLLECTIONS.find((c) => c.handle === handle) ?? null;
  try {
    const data = await storefront(`
      ${PRODUCT_FIELDS}
      query CollectionByHandle($handle: String!) {
        collection(handle: $handle) {
          handle title description
          image { url altText }
          products(first: 50) { nodes { ...ProductFields } }
        }
      }
    `, { handle });
    if (!data.collection) return null;
    const c = data.collection;
    return {
      handle: c.handle, title: c.title, description: c.description,
      image: c.image?.url,
      products: c.products.nodes.map(mapProduct),
    };
  } catch {
    return FALLBACK_COLLECTIONS.find((c) => c.handle === handle) ?? null;
  }
}

// --- Cart (client-side) ---

export async function cartCreate(lines: CartLineInput[]): Promise<{ cartId: string; checkoutUrl: string }> {
  const data = await storefront(`
    mutation CartCreate($lines: [CartLineInput!]!) {
      cartCreate(input: { lines: $lines }) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }
  `, { lines });
  const cart = data.cartCreate.cart;
  if (!cart) throw new Error(data.cartCreate.userErrors?.[0]?.message ?? 'Cart creation failed');
  return { cartId: cart.id, checkoutUrl: cart.checkoutUrl };
}

export async function cartLinesAdd(cartId: string, lines: CartLineInput[]): Promise<{ checkoutUrl: string; totalQuantity: number }> {
  const data = await storefront(`
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { id checkoutUrl totalQuantity }
        userErrors { field message }
      }
    }
  `, { cartId, lines });
  const cart = data.cartLinesAdd.cart;
  if (!cart) throw new Error(data.cartLinesAdd.userErrors?.[0]?.message ?? 'Failed to add lines');
  return { checkoutUrl: cart.checkoutUrl, totalQuantity: cart.totalQuantity };
}

export async function getCartQuantity(cartId: string): Promise<number> {
  try {
    const data = await storefront(`
      query CartQuantity($cartId: ID!) {
        cart(id: $cartId) { totalQuantity }
      }
    `, { cartId });
    return data.cart?.totalQuantity ?? 0;
  } catch {
    return 0;
  }
}

// --- Cart query & mutations (client-side) ---

const CART_LINE_FIELDS = `
  fragment CartLineFields on BaseCartLine {
    id
    quantity
    attributes { key value }
    merchandise {
      ... on ProductVariant {
        id title sku
        product { title handle }
        price { amount currencyCode }
        image { url altText }
      }
    }
    cost { totalAmount { amount currencyCode } }
  }
`;

const CART_FIELDS = `
  ${CART_LINE_FIELDS}
  fragment CartFields on Cart {
    id checkoutUrl totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 100) { nodes { ...CartLineFields } }
  }
`;

/** Fetch full cart. Returns null for expired/invalid carts (clears localStorage). */
export async function cartQuery(cartId: string): Promise<Cart | null> {
  try {
    const data = await storefront(`
      ${CART_FIELDS}
      query CartQuery($cartId: ID!) { cart(id: $cartId) { ...CartFields } }
    `, { cartId });
    if (!data.cart) {
      clearStoredCart();
      return null;
    }
    return mapCart(data.cart);
  } catch {
    clearStoredCart();
    return null;
  }
}

/** Update quantities on existing lines. */
export async function cartLinesUpdate(
  cartId: string,
  lines: Array<{ id: string; quantity: number }>,
): Promise<Cart> {
  const data = await storefront(`
    ${CART_FIELDS}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
  `, { cartId, lines });
  const cart = data.cartLinesUpdate.cart;
  if (!cart) throw new Error(data.cartLinesUpdate.userErrors?.[0]?.message ?? 'Failed to update lines');
  dispatchCartUpdated();
  return mapCart(cart);
}

/** Remove lines from cart. */
export async function cartLinesRemove(cartId: string, lineIds: string[]): Promise<Cart> {
  const data = await storefront(`
    ${CART_FIELDS}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
  `, { cartId, lineIds });
  const cart = data.cartLinesRemove.cart;
  if (!cart) throw new Error(data.cartLinesRemove.userErrors?.[0]?.message ?? 'Failed to remove lines');
  dispatchCartUpdated();
  return mapCart(cart);
}

function mapCart(raw: any): Cart {
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    cost: {
      subtotalAmount: {
        amount: raw.cost.subtotalAmount.amount,
        currencyCode: raw.cost.subtotalAmount.currencyCode,
      },
    },
    lines: (raw.lines?.nodes ?? []).map((l: any) => ({
      id: l.id,
      quantity: l.quantity,
      attributes: (l.attributes ?? []).map((a: any) => ({ key: a.key, value: a.value })),
      merchandise: {
        id: l.merchandise.id,
        title: l.merchandise.title,
        sku: l.merchandise.sku ?? '',
        product: { title: l.merchandise.product.title, handle: l.merchandise.product.handle },
        price: { amount: l.merchandise.price.amount, currencyCode: l.merchandise.price.currencyCode },
        image: l.merchandise.image ? { url: l.merchandise.image.url, altText: l.merchandise.image.altText } : null,
      },
      cost: { totalAmount: { amount: l.cost.totalAmount.amount, currencyCode: l.cost.totalAmount.currencyCode } },
    })),
  };
}

/** Dispatch cart-updated event (call from islands after mutations). */
export function dispatchCartUpdated(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('cart-updated'));
}

// --- Variant helpers ---

/** Find variant matching all selected options. */
export function findVariant(variants: Variant[], selections: Record<string, string>): Variant | undefined {
  return variants.find((v) =>
    v.selectedOptions.every((opt) => selections[opt.name] === opt.value),
  );
}

/** Build cart lines from selected variant + add-on variant IDs. */
export function buildCartLines(
  variantId: string,
  quantity: number,
  addonVariantIds: string[],
  attributes?: Array<{ key: string; value: string }>,
): CartLineInput[] {
  const lines: CartLineInput[] = [{ merchandiseId: variantId, quantity, attributes }];
  for (const id of addonVariantIds) {
    lines.push({ merchandiseId: id, quantity });
  }
  return lines;
}

/** Sanitise descriptionHtml: strip script tags. */
export function sanitizeHtml(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

/** Extract spec table rows from descriptionHtml if present. */
export function extractSpecsFromHtml(html: string): Array<[string, string]> | null {
  const rows: Array<[string, string]> = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const tds: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      tds.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
    }
    if (tds.length >= 2) rows.push([tds[0], tds[1]]);
  }
  return rows.length > 0 ? rows : null;
}

// --- Cart storage helpers (client-side) ---

export function getStoredCartId(): string | null {
  try { return localStorage.getItem('calib-cart-id'); } catch { return null; }
}

export function setStoredCartId(id: string): void {
  try { localStorage.setItem('calib-cart-id', id); } catch { /* private browsing */ }
}

export function clearStoredCart(): void {
  try { localStorage.removeItem('calib-cart-id'); } catch { /* private browsing */ }
}

// --- Fallback data ---

const FALLBACK_PRODUCTS: Product[] = [
  {
    handle: 'checkerboard-composite', title: 'Checkerboard calibration target',
    description: 'Aluminium composite, fine or coarse pattern.', descriptionHtml: '',
    priceFrom: '€79', priceMinAmount: '79.00', priceMinCurrency: 'EUR',
    image: undefined, images: [], options: [
      { name: 'Size', values: ['200 × 150', '300 × 200', '400 × 300', '600 × 400', '800 × 600'] },
      { name: 'Pattern', values: ['7×10, 25 mm', '9×6, 30 mm', '5×8, 40 mm'] },
    ], variants: [], metafields: {}, url: '/targets/checkerboard-composite/',
  },
  {
    handle: 'charuco-composite', title: 'ChArUco calibration target',
    description: 'Aluminium composite, UV-printed matte pattern, 6 mm thick.', descriptionHtml: '',
    priceFrom: '€89', priceMinAmount: '89.00', priceMinCurrency: 'EUR',
    image: undefined, images: [], options: [
      { name: 'Size', values: ['200 × 150', '300 × 200', '400 × 300', '600 × 400', '800 × 600'] },
      { name: 'Dictionary', values: ['DICT_6X6_250', 'DICT_5X5_100', 'DICT_4X4_50', 'AprilTag 36h11'] },
    ], variants: [], metafields: {}, url: '/targets/charuco-composite/',
  },
  {
    handle: 'charuco-ceramic', title: 'ChArUco ceramic target',
    description: 'Lithographed blue chrome on alumina, ±2 µm.', descriptionHtml: '',
    priceFrom: '€189', priceMinAmount: '189.00', priceMinCurrency: 'EUR',
    image: undefined, images: [], options: [
      { name: 'Size', values: ['100 × 100', '150 × 150', '200 × 200'] },
      { name: 'Dictionary', values: ['DICT_6X6_250', 'DICT_5X5_100'] },
    ], variants: [], metafields: {}, url: '/targets/charuco-ceramic/',
  },
  {
    handle: 'mounting-fixture', title: 'Mounting fixture',
    description: '¼″ thread, aluminium, fits all boards.', descriptionHtml: '',
    priceFrom: '€39', priceMinAmount: '39.00', priceMinCurrency: 'EUR',
    image: undefined, images: [], options: [], variants: [], metafields: {},
    url: '/targets/mounting-fixture/',
  },
  {
    handle: 'certificate-ilac', title: 'ILAC calibration certificate',
    description: 'ILAC-recognised dimensional calibration certificate.', descriptionHtml: '',
    priceFrom: '€149', priceMinAmount: '149.00', priceMinCurrency: 'EUR',
    image: undefined, images: [], options: [], variants: [], metafields: {},
    url: '/targets/certificate-ilac/',
  },
];

const FALLBACK_COLLECTIONS: Collection[] = [
  { handle: 'composite-boards', title: 'Composite boards', description: '200–1200 mm, rigid, matte, outdoor-safe.', products: FALLBACK_PRODUCTS.filter((p) => p.handle.includes('composite')) },
  { handle: 'ceramic-glass', title: 'Ceramic & glass', description: 'Lithographed, ±1–2 µm, certificate option.', products: FALLBACK_PRODUCTS.filter((p) => p.handle.includes('ceramic')) },
  { handle: 'lidar-image-quality', title: 'LiDAR & image quality', description: 'Reflectance panels, ISO 12233 charts, IR boards.', products: [] },
  { handle: 'mounts-accessories', title: 'Mounts & accessories', description: 'Fixtures, stands, robot flange, hard cases.', products: FALLBACK_PRODUCTS.filter((p) => p.handle === 'mounting-fixture' || p.handle === 'certificate-ilac') },
];
