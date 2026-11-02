import { useState } from 'react';
import { FileText, ShoppingCart, Loader2, Minus, Plus } from '@/lib/icons';
import {
  cartCreate, cartLinesAdd, dispatchCartUpdated,
  getStoredCartId, setStoredCartId,
  type Product, type Variant,
} from '@/lib/shopify';
import { availabilityLabel } from '@/lib/collectionSpecs';
import { SHIPS_FROM } from '@/lib/claims';
import { idRange } from '@/lib/idRange';
import type { PatternSpec } from '@/lib/patterns';
import { findCharucoSize, findAprilGridSize } from '@/lib/boardSizes';

interface Props {
  product: Product;
  /** Fallback datasheet URL when metafield is empty. */
  datasheetUrl?: string;
}

/** Extract display columns from a variant + product metafields. */
function variantColumns(variant: Variant, product: Product, fallbackDocsUrl?: string) {
  const m = product.metafields;
  const opts = Object.fromEntries(variant.selectedOptions.map((o) => [o.name, o.value]));

  // Size from selected options
  const size = opts['Size'] ?? '';
  // Dictionary / pattern from selected options or metafield
  const dictOrPattern = opts['Dictionary'] ?? opts['Pattern'] ?? m.dictionary ?? '';
  // Squares from metafield
  const squares = m.squares ?? '';

  // ID range — derive from boardSizes using the variant's selected Size
  let idsLabel = '';
  const isAprilGrid = product.handle.includes('aprilgrid');
  if (size) {
    const agSize = isAprilGrid ? findAprilGridSize(size) : null;
    const chSize = !isAprilGrid ? findCharucoSize(size) : null;
    if (agSize) {
      const spec: PatternSpec = {
        type: 'AprilGrid (Kalibr)', rows: agSize.rows, cols: agSize.cols,
        square: agSize.tagSize, marker: agSize.tagSize,
        dict: 'DICT_APRILTAG_36h11', paper: 'A4', startId: Number(m.start_id ?? 0), scaleBar: false,
      };
      const range = idRange(spec);
      if (range) idsLabel = `IDs ${range.min}\u2013${range.max}`;
    } else if (chSize) {
      const dict = dictOrPattern || m.dictionary || '';
      const spec: PatternSpec = {
        type: 'ChArUco', rows: chSize.rows, cols: chSize.cols,
        square: chSize.square, marker: chSize.marker,
        dict, paper: 'A4', startId: Number(m.start_id ?? 0), scaleBar: false,
      };
      const range = idRange(spec);
      if (range) idsLabel = `IDs ${range.min}\u2013${range.max}`;
    }
  }

  const available = availabilityLabel(m.lead_time, variant.availableForSale);
  const docsUrl = m.datasheet_url || fallbackDocsUrl || '';

  return { size, dictOrPattern, squares, idsLabel, available, docsUrl };
}

export default function PurchaseTable({ product, datasheetUrl: fallbackUrl }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busyVariant, setBusyVariant] = useState<string | null>(null);

  const getQty = (variantId: string) => quantities[variantId] ?? 1;

  const setQty = (variantId: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [variantId]: Math.max(1, qty) }));
  };

  const handleAddToCart = async (variant: Variant) => {
    setBusyVariant(variant.id);
    try {
      const qty = getQty(variant.id);
      const line = { merchandiseId: variant.id, quantity: qty };
      const existingCartId = getStoredCartId();

      if (existingCartId) {
        try {
          await cartLinesAdd(existingCartId, [line]);
        } catch {
          const result = await cartCreate([line]);
          setStoredCartId(result.cartId);
        }
      } else {
        const result = await cartCreate([line]);
        setStoredCartId(result.cartId);
      }

      dispatchCartUpdated();
      window.dispatchEvent(new Event('open-cart-drawer'));
    } catch {
      // Cart error — drawer won't open, but no crash
    } finally {
      setBusyVariant(null);
    }
  };

  const variants = product.variants;
  const isCharuco = product.handle.includes('charuco') || product.handle.includes('aprilgrid');

  if (variants.length === 0) {
    return (
      <div className="rounded border border-line bg-ground-panel p-5 text-center text-sm text-ink-muted">
        Variants and pricing are loaded from Shopify at build time. Run with credentials to see the purchase table.
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="flex items-center justify-between border-b border-line pb-2 mb-0">
        <span className="text-sm font-semibold text-ink">
          {product.title} ({variants.length} item{variants.length !== 1 ? 's' : ''})
        </span>
        <span className="text-xs text-ink-soft hidden sm:inline">{SHIPS_FROM}</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-line bg-ground-alt text-left text-[12px] font-semibold uppercase tracking-wider text-ink-soft">
              <th className="py-2.5 px-3">Part no.</th>
              <th className="py-2.5 px-3">Size</th>
              <th className="py-2.5 px-3">{isCharuco ? 'Dictionary' : 'Pattern'}</th>
              <th className="py-2.5 px-3">Squares</th>
              <th className="py-2.5 px-3">Docs</th>
              <th className="py-2.5 px-3">Available</th>
              <th className="py-2.5 px-3 text-right">Price</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const cols = variantColumns(v, product, fallbackUrl);
              const qty = getQty(v.id);
              const busy = busyVariant === v.id;
              return (
                <tr key={v.id} className="border-b border-line hover:bg-ground-alt/50">
                  <td className="py-3 px-3">
                    <a
                      href={`${product.url}?variant=${encodeURIComponent(v.id)}`}
                      className="font-mono text-[13px] text-brand-dark hover:text-brand no-underline min-h-[24px] inline-flex items-center"
                    >
                      {v.sku || v.title}
                    </a>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">{cols.size}</td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-[13px]">{cols.dictOrPattern}</span>
                    {cols.idsLabel && (
                      <span className="block text-[12px] text-ink-soft mt-0.5">
                        {cols.idsLabel}
                        {isCharuco && (
                          <a
                            href={`${product.url}#board-set`}
                            className="ml-1.5 text-brand text-[12px] no-underline hover:underline min-h-[24px] inline-flex items-center"
                          >
                            set&hellip;
                          </a>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 spec">{cols.squares}</td>
                  <td className="py-3 px-3">
                    {cols.docsUrl ? (
                      <a href={cols.docsUrl} target="_blank" rel="noopener" className="text-ink-soft hover:text-brand min-h-[24px] inline-flex items-center" title="Datasheet PDF">
                        <FileText size={16} strokeWidth={1.6} aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-ink-soft/40">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3"><span className="badge border border-line text-ink">{cols.available}</span></td>
                  <td className="py-3 px-3 spec text-right font-semibold">{v.price}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center rounded border border-line">
                      <button
                        type="button"
                        aria-label="Decrease"
                        className="h-[36px] w-[32px] text-center text-ink-muted hover:text-ink disabled:opacity-40"
                        disabled={qty <= 1}
                        onClick={() => setQty(v.id, qty - 1)}
                      ><Minus size={14} strokeWidth={1.6} aria-hidden="true" /></button>
                      <span className="w-7 text-center text-[13px]">{qty}</span>
                      <button
                        type="button"
                        aria-label="Increase"
                        className="h-[36px] w-[32px] text-center text-ink-muted hover:text-ink"
                        onClick={() => setQty(v.id, qty + 1)}
                      ><Plus size={14} strokeWidth={1.6} aria-hidden="true" /></button>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      aria-label={`Add ${v.sku || v.title} to cart`}
                      disabled={busy || !v.availableForSale}
                      onClick={() => handleAddToCart(v)}
                      className="flex h-[36px] w-[36px] items-center justify-center rounded bg-brand text-white hover:bg-brand-dark disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <ShoppingCart size={16} strokeWidth={1.6} aria-hidden="true" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="md:hidden flex flex-col divide-y divide-line border-t border-line">
        {variants.map((v) => {
          const cols = variantColumns(v, product, fallbackUrl);
          const qty = getQty(v.id);
          const busy = busyVariant === v.id;
          return (
            <div key={v.id} className="flex flex-col gap-2.5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <a
                    href={`${product.url}?variant=${encodeURIComponent(v.id)}`}
                    className="font-mono text-[13px] text-brand-dark hover:text-brand no-underline min-h-[44px] inline-flex items-center"
                  >
                    {v.sku || v.title}
                  </a>
                  <span className="text-sm">{cols.size}</span>
                  {cols.dictOrPattern && (
                    <span className="font-mono text-[12px] text-ink-muted">{cols.dictOrPattern}</span>
                  )}
                  {cols.idsLabel && (
                    <span className="text-[12px] text-ink-soft">
                      {cols.idsLabel}
                      {isCharuco && (
                        <a href={`${product.url}#board-set`} className="ml-1.5 text-brand text-[12px] no-underline hover:underline min-h-[44px] inline-flex items-center">set&hellip;</a>
                      )}
                    </span>
                  )}
                </div>
                <span className="spec text-base font-semibold shrink-0">{v.price}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="badge border border-line text-ink">{cols.available}</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded border border-line">
                    <button
                      type="button"
                      aria-label="Decrease"
                      className="h-[44px] w-[44px] text-center text-lg text-ink-muted hover:text-ink disabled:opacity-40"
                      disabled={qty <= 1}
                      onClick={() => setQty(v.id, qty - 1)}
                    ><Minus size={16} strokeWidth={1.6} aria-hidden="true" /></button>
                    <span className="w-8 text-center text-sm">{qty}</span>
                    <button
                      type="button"
                      aria-label="Increase"
                      className="h-[44px] w-[44px] text-center text-lg text-ink-muted hover:text-ink"
                      onClick={() => setQty(v.id, qty + 1)}
                    ><Plus size={16} strokeWidth={1.6} aria-hidden="true" /></button>
                  </div>
                  <button
                    type="button"
                    aria-label={`Add ${v.sku || v.title} to cart`}
                    disabled={busy || !v.availableForSale}
                    onClick={() => handleAddToCart(v)}
                    className="flex h-[44px] w-[44px] items-center justify-center rounded bg-brand text-white hover:bg-brand-dark disabled:opacity-40"
                  >
                    {busy ? (
                      <Loader2 size={18} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <ShoppingCart size={18} strokeWidth={1.6} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
