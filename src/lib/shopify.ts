/**
 * Minimal Shopify Storefront API client.
 * The site is static: product data is fetched at build time; cart/checkout
 * lives on shop.calib.tools. Replace with @shopify/storefront-api-client when needed.
 */
const domain = import.meta.env.PUBLIC_SHOPIFY_DOMAIN;
const token = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

export interface Product {
  handle: string;
  title: string;
  description: string;
  priceFrom: string;
  image?: string;
  url: string;
}

const PRODUCTS_QUERY = `
query Products($first: Int!) {
  products(first: $first) {
    nodes {
      handle title description onlineStoreUrl
      priceRange { minVariantPrice { amount currencyCode } }
      featuredImage { url altText }
    }
  }
}`;

/** Fallback used until the Storefront token is configured. */
const FALLBACK: Product[] = [
  { handle: 'charuco-composite', title: 'ChArUco calibration target', description: 'Aluminium composite, UV-printed matte pattern, 6 mm thick.', priceFrom: '€89', url: '/targets/charuco-composite/' },
  { handle: 'checkerboard-composite', title: 'Checkerboard calibration target', description: 'Aluminium composite, fine or coarse pattern.', priceFrom: '€79', url: '/targets/checkerboard-composite/' },
  { handle: 'charuco-ceramic', title: 'ChArUco ceramic target', description: 'Lithographed blue chrome on alumina, ±2 µm.', priceFrom: '€189', url: '/targets/charuco-ceramic/' },
];

export async function getProducts(first = 24): Promise<Product[]> {
  if (!domain || !token || token === 'replace-me') return FALLBACK;
  const res = await fetch(`https://${domain}/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
    body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { first } }),
  });
  if (!res.ok) return FALLBACK;
  const json = await res.json();
  return json.data.products.nodes.map((n: any) => ({
    handle: n.handle,
    title: n.title,
    description: n.description,
    priceFrom: `${n.priceRange.minVariantPrice.currencyCode === 'EUR' ? '€' : ''}${Number(n.priceRange.minVariantPrice.amount).toFixed(0)}`,
    image: n.featuredImage?.url,
    url: n.onlineStoreUrl ?? `https://${domain}/products/${n.handle}`,
  }));
}
