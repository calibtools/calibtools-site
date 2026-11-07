/**
 * Shopify Storefront API client (API version 2025-07).
 * Build-time: getProducts, getProductByHandle, getCollections, getCollectionProducts.
 * Client-side: cartCreate, cartLinesAdd, customerCreate.
 * Falls back to static data when env vars are missing so builds never fail.
 */

import { MULTI_SENSOR_HANDLES } from './constants';
import { fallbackMinEur } from './prices';

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

/** Format a price for card display. Returns empty string for zero/quote-only products. */
export function formatCardPrice(priceFrom: string): string {
  // Strip currency symbol and whitespace, check if the numeric value is 0
  const numeric = priceFrom.replace(/[^0-9.]/g, '');
  if (!numeric || Number(numeric) === 0) return '';
  return priceFrom;
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
  const isWithdrawn = (h: string) => WITHDRAWN_HANDLES.includes(h);
  if (!hasCredentials()) {
    console.warn('\n⚠️  USING FALLBACK DATA — no Storefront credentials. Variants will be empty, cart will be disabled.\n');
    return FALLBACK_PRODUCTS.filter((p) => !isWithdrawn(p.handle));
  }
  try {
    const data = await storefront(`
      ${PRODUCT_FIELDS}
      query Products($first: Int!) {
        products(first: $first) { nodes { ...ProductFields } }
      }
    `, { first });
    const apiProducts = data.products.nodes.map(mapProduct).filter((p: Product) => !isWithdrawn(p.handle));
    // Merge fallback products for handles not yet in Shopify
    const apiHandles = new Set(apiProducts.map((p: Product) => p.handle));
    const missing = FALLBACK_PRODUCTS.filter((p) => !apiHandles.has(p.handle) && !isWithdrawn(p.handle));
    return [...apiProducts, ...missing];
  } catch {
    console.warn('\n⚠️  USING FALLBACK DATA — Storefront API query failed. No variants, cart will be disabled.\n');
    return FALLBACK_PRODUCTS.filter((p) => !isWithdrawn(p.handle));
  }
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  if (WITHDRAWN_HANDLES.includes(handle)) return null;
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
    // Fall back to local data if product not in Shopify yet
    return data.product ? mapProduct(data.product) : (FALLBACK_PRODUCTS.find((p) => p.handle === handle) ?? null);
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
    const api: Collection[] = data.collections.nodes.map((c: any) => ({
      handle: c.handle,
      title: c.title,
      description: c.description,
      image: c.image?.url,
      products: c.products.nodes.map(mapProduct).filter((p: Product) => !WITHDRAWN_HANDLES.includes(p.handle)),
    }));
    // Collections defined only locally (e.g. quote-only families) are added after Shopify's.
    const have = new Set(api.map((c) => c.handle));
    return [...api, ...FALLBACK_COLLECTIONS.filter((c) => !have.has(c.handle))];
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
    if (!data.collection) return FALLBACK_COLLECTIONS.find((c) => c.handle === handle) ?? null;
    const c = data.collection;
    const isWithdrawn = (h: string) => WITHDRAWN_HANDLES.includes(h);
    const apiProducts = c.products.nodes.map(mapProduct).filter((p: Product) => !isWithdrawn(p.handle));
    // Merge fallback products for handles not yet in Shopify
    const apiHandles = new Set(apiProducts.map((p: Product) => p.handle));
    const fallback = FALLBACK_COLLECTIONS.find((fc) => fc.handle === handle);
    const missing = fallback ? fallback.products.filter((p) => !apiHandles.has(p.handle) && !isWithdrawn(p.handle)) : [];
    return {
      handle: c.handle, title: c.title, description: c.description,
      image: c.image?.url,
      products: [...apiProducts, ...missing],
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

/**
 * Build a single cart line for a board set.
 * quantity = boardCount × userQuantity, with attributes encoding the full set.
 */
export function buildSetCartLine(
  variantId: string,
  boardCount: number,
  userQuantity: number,
  startId: number,
  idRanges: string[],
): CartLineInput {
  const totalQty = boardCount * userQuantity;
  const fullSpan = `${idRanges[0].split('\u2013')[0]}\u2013${idRanges[idRanges.length - 1].split('\u2013')[1]}`;
  return {
    merchandiseId: variantId,
    quantity: totalQty,
    attributes: [
      { key: 'start_id', value: String(startId) },
      { key: 'id_range', value: fullSpan },
      { key: 'id_ranges', value: idRanges.join(', ') },
      { key: 'boards', value: String(totalQty) },
    ],
  };
}

/**
 * Find the highest end ID for a given variant across existing cart lines.
 * Returns -1 if no set lines exist for this variant.
 */
export function highestEndId(cart: Cart | null, variantId: string): number {
  if (!cart) return -1;
  let max = -1;
  for (const line of cart.lines) {
    if (line.merchandise.id !== variantId) continue;
    const rangeAttr = line.attributes.find(a => a.key === 'id_range');
    if (!rangeAttr) continue;
    // id_range is "min–max" (en-dash U+2013)
    const parts = rangeAttr.value.split('\u2013');
    if (parts.length === 2) {
      const end = parseInt(parts[1], 10);
      if (!isNaN(end) && end > max) max = end;
    }
  }
  return max;
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

// --- Withdrawn handles ---

/** Handles withdrawn from sale — excluded from product lists and page generation. */
export const WITHDRAWN_HANDLES = ['certificate-ilac'];

// --- Fallback data ---

function fb(handle: string, title: string, desc: string, opts: Product['options'], url: string): Product {
  const eur = fallbackMinEur(handle);
  return {
    handle, title, description: desc, descriptionHtml: '',
    priceFrom: `€${eur}`, priceMinAmount: `${eur}.00`, priceMinCurrency: 'EUR',
    image: undefined, images: [], options: opts, variants: [], metafields: {}, url,
  };
}

const FALLBACK_PRODUCTS: Product[] = [
  fb('checkerboard-composite', 'Checkerboard Calibration Target, Aluminum Composite',
    'Aluminum composite, fine or coarse pattern.',
    [
      { name: 'Size', values: ['200 × 150', '300 × 200', '400 × 300', '600 × 400', '800 × 600'] },
      { name: 'Pattern', values: ['7×10, 25 mm', '9×6, 30 mm', '5×8, 40 mm'] },
    ], '/targets/checkerboard-composite/'),
  fb('charuco-composite', 'ChArUco Calibration Target, Aluminum Composite',
    'Aluminum composite, UV-printed matte pattern, 6 mm thick.',
    [
      { name: 'Size', values: ['200 × 150', '300 × 200', '400 × 300', '600 × 400', '800 × 600'] },
      { name: 'Dictionary', values: ['DICT_6X6_250', 'DICT_5X5_100', 'DICT_4X4_50', 'AprilTag 36h11'] },
    ], '/targets/charuco-composite/'),
  fb('charuco-ceramic', 'ChArUco Calibration Target, Alumina Ceramic',
    'Lithographed blue chrome on alumina, ±2 µm (target).',
    [
      { name: 'Size', values: ['110 × 85', '150 × 100', '185 × 110', '230 × 140'] },
      { name: 'Dictionary', values: ['DICT_6X6_250', 'DICT_5X5_100'] },
    ], '/targets/charuco-ceramic/'),
  fb('mounting-fixture', 'Target Mounting Fixture, ¼″-20',
    '¼″ thread, aluminum, fits all boards.',
    [], '/targets/mounting-fixture/'),
  fb('certificate-ilac', 'ILAC calibration certificate',
    'ILAC-recognised dimensional calibration certificate.',
    [], '/targets/certificate-ilac/'),
  fb('aprilgrid-composite', 'AprilGrid Calibration Target, Aluminum Composite',
    'Aluminum composite, AprilTag 36h11, for Kalibr camera–IMU calibration.',
    [
      { name: 'Size', values: ['200 × 150', '300 × 200', '400 × 300', '600 × 400', '800 × 600'] },
    ], '/targets/aprilgrid-composite/'),
  fb('circlegrid-composite', 'Circle Grid Calibration Target, Aluminum Composite',
    'Aluminum composite, symmetric or asymmetric circle grid.',
    [
      { name: 'Size', values: ['200 × 150', '300 × 200', '400 × 300', '600 × 400', '800 × 600'] },
      { name: 'Layout', values: ['Symmetric', 'Asymmetric'] },
    ], '/targets/circlegrid-composite/'),
  fb('halcon-composite', 'HALCON Calibration Plate, Aluminum Composite',
    'Aluminum composite, MVTec HALCON mark layout.',
    [
      { name: 'Size', values: ['200 × 150', '300 × 200', '400 × 300', '600 × 400', '800 × 600'] },
    ], '/targets/halcon-composite/'),
  fb('reflectance-panel', 'LiDAR Reflectance Panel, Lambertian',
    'Calibrated Lambertian reflectance panel for LiDAR intensity calibration.',
    [], '/targets/reflectance-panel/'),
  fb('resolution-chart', 'ISO 12233 Resolution Test Chart',
    'Resolution test chart for imaging system evaluation.',
    [], '/targets/resolution-chart/'),
  fb("lidar-camera-target", "LiDAR-Camera Calibration Target",
    "Joint target for camera–LiDAR extrinsic calibration.",
    [], '/targets/lidar-camera-target/'),
  fb("thermal-calibration-target", "Heated Thermal Calibration Target",
    "Heated geometric calibration target for LWIR thermal cameras.",
    [], '/targets/thermal-calibration-target/'),
  fb("nir-calibration-target", "NIR Calibration Target, 850 / 940 nm",
    "ChArUco and checkerboard targets with strong contrast at 850 and 940 nm.",
    [], '/targets/nir-calibration-target/'),
  fb("depth-camera-target", "Depth & ToF Camera Calibration Targets",
    "Step blocks and NIR-uniform boards for ToF, structured-light and stereo depth cameras.",
    [], '/targets/depth-camera-target/'),
  fb("hand-eye-calibration-kit", "Hand-Eye Calibration Kit",
    "ChArUco target with robot flange adapter for eye-in-hand and eye-to-hand calibration.",
    [], '/targets/hand-eye-calibration-kit/'),
  fb("multi-camera-target", "Multi-Camera Calibration Target",
    "Multi-face ChArUco target with distinct marker IDs on every face.",
    [], '/targets/multi-camera-target/'),
  fb("line-scan-target", "Line-Scan Camera Calibration Target",
    "Long chrome-on-glass strip targets for line-scan camera alignment and calibration.",
    [], '/targets/line-scan-target/'),
  fb("radar-camera-target", "Radar-Camera Calibration Target",
    "Trihedral reflectors and joint radar-camera targets for automotive sensor fusion.",
    [], '/targets/radar-camera-target/'),
];

const FALLBACK_COLLECTIONS: Collection[] = [
  { handle: 'composite-boards', title: 'Aluminum Composite Targets', description: '200–1200 mm, rigid, matte, outdoor-safe.', products: FALLBACK_PRODUCTS.filter((p) => p.handle.includes('composite')) },
  { handle: 'ceramic-glass', title: 'Ceramic & Glass Targets', description: 'Lithographed, ±2 µm (target).', products: FALLBACK_PRODUCTS.filter((p) => p.handle.includes('ceramic')) },
  { handle: 'lidar-image-quality', title: 'LiDAR & Image Quality Targets', description: 'Reflectance panels and ISO 12233 charts.', products: FALLBACK_PRODUCTS.filter((p) => ['reflectance-panel', 'resolution-chart'].includes(p.handle)) },
  { handle: 'multi-sensor', title: 'Multi-Sensor & Specialty Targets', description: 'LiDAR, radar, thermal, NIR, depth, hand-eye, multi-camera and line-scan targets.', products: FALLBACK_PRODUCTS.filter((p) => MULTI_SENSOR_HANDLES.includes(p.handle)) },
  { handle: 'mounts-accessories', title: 'Mounts & Accessories', description: 'Fixtures, stands, robot flange, hard cases.', products: FALLBACK_PRODUCTS.filter((p) => p.handle === 'mounting-fixture') },
];
