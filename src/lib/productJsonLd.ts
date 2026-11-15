import type { Variant } from './shopify';

/** Shopify options that change the printed pattern map to schema.org/pattern. */
const PATTERN_OPTIONS = new Set(['dictionary', 'layout', 'pattern']);

function schemaPropFor(optionName: string): 'size' | 'pattern' | null {
  const key = optionName.toLowerCase();
  if (key === 'size') return 'size';
  if (PATTERN_OPTIONS.has(key)) return 'pattern';
  return null;
}

/** ProductGroup.variesBy from the product's option names. */
export function variesByFor(options: Array<{ name: string }>): string[] {
  return [...new Set(options.map((o) => schemaPropFor(o.name)).filter((p): p is 'size' | 'pattern' => p !== null))]
    .map((p) => `https://schema.org/${p}`);
}

/**
 * Landing URL for one variant: the product page with ?variant=<numeric id>,
 * the same form Shopify sends to Google Shopping (the page preselects it).
 */
export function variantUrl(productUrl: string, variantId: string): string {
  const m = /\/ProductVariant\/(\d+)$/.exec(variantId);
  return m ? `${productUrl}?variant=${m[1]}` : productUrl;
}

/** One entry of ProductGroup.hasVariant. */
export function variantJsonLd(args: {
  variant: Variant;
  productTitle: string;
  productUrl: string;
  groupId: string;
  priceValidUntil: string;
}): Record<string, any> {
  const { variant: v, productTitle, productUrl, groupId, priceValidUntil } = args;
  const ld: Record<string, any> = {
    '@type': 'Product',
    name: `${productTitle} — ${v.title}`,
    sku: v.sku || undefined,
    inProductGroupWithID: groupId,
  };
  for (const opt of v.selectedOptions) {
    const prop = schemaPropFor(opt.name);
    if (prop && ld[prop] === undefined) ld[prop] = opt.value;
  }
  ld.offers = {
    '@type': 'Offer',
    price: v.priceAmount,
    priceCurrency: v.currencyCode,
    priceValidUntil,
    availability: v.availableForSale ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: variantUrl(productUrl, v.id),
    seller: { '@type': 'Organization', name: 'Calib.Tools' },
  };
  return ld;
}
