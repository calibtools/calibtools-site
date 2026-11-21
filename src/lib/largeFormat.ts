/**
 * Large-format sizes (owner decision 2026-11-21, pricing-display strategy): 400 × 300 and smaller are
 * listed with a price and go in the cart; 600 × 400 and 800 × 600 show "From <price>" and are ordered
 * through a quote. The starting price is the variant's own Shopify price (the factory's retail price × 3
 * at 6.8 CNY/USD; the table is in docs/pricing/README.md), so prices stay in Shopify. This file only says which sizes are quoted; product pages, ordering tables,
 * collection tables and structured data all read it.
 */
import type { Variant } from './shopify';

export const LARGE_FORMAT_SIZES = ['600×400', '800×600'] as const;
export type LargeFormatSize = (typeof LARGE_FORMAT_SIZES)[number];

/** "800 × 600 mm", "800x600", "800×600 / Fine" → "800×600"; anything else → null. */
export function largeFormatSize(sizeValue: string | undefined | null): LargeFormatSize | null {
  if (!sizeValue) return null;
  const m = /(\d+)\s*[×xX]\s*(\d+)/.exec(sizeValue);
  if (!m) return null;
  const key = `${m[1]}×${m[2]}`;
  return (LARGE_FORMAT_SIZES as readonly string[]).includes(key) ? (key as LargeFormatSize) : null;
}

/** Adds "From" and thousands separators to a formatted Shopify price ("<symbol>1009" → "From <symbol>1,009"). */
export function fromLabel(price: string): string {
  const m = /^([^\d]*)([\d.,]+)(.*)$/.exec(price.trim());
  if (!m) return `From ${price}`;
  const n = Number(m[2].replace(/,/g, ''));
  const shown = Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : m[2];
  return `From ${m[1]}${shown}${m[3]}`;
}

function sizeOf(v: Pick<Variant, 'selectedOptions'>): string {
  return v.selectedOptions.find((o) => o.name.toLowerCase() === 'size')?.value ?? '';
}

/** True when this variant is ordered through a quote rather than the cart. */
export function isLargeFormatVariant(v: Pick<Variant, 'selectedOptions'>): boolean {
  return largeFormatSize(sizeOf(v)) !== null;
}

/** Quote-form link for a large-format variant; the product line carries the size and part number. */
export function largeFormatQuoteHref(productTitle: string, v: Pick<Variant, 'title' | 'sku'>): string {
  const label = `${productTitle} — ${v.title}${v.sku ? ` (${v.sku})` : ''}`.slice(0, 120);
  return `/quote/?product=${encodeURIComponent(label)}`;
}
