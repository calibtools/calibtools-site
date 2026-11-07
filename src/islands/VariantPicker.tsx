import { useState, useEffect, useRef, useMemo } from 'react';
import { Check, Minus, Plus, ArrowRight } from '@/lib/icons';
import {
  findVariant, buildCartLines, buildSetCartLine, highestEndId,
  cartCreate, cartLinesAdd, cartQuery,
  getStoredCartId, setStoredCartId, dispatchCartUpdated,
  type Product,
} from '@/lib/shopify';
import { computeSetBoards } from '@/lib/exportSet';
import { dictMarkerCount } from '@/lib/dicts/dicts';
import { LEAD_TIME, INSPECTION_CLAIM_SHORT } from '@/lib/claims';
import { findCharucoSize, findAprilGridSize, markerCount } from '@/lib/boardSizes';

interface BoardSetImage {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

interface Props {
  product: Product;
  /** Variant ID for the mounting fixture add-on. */
  fixtureVariantId?: string;
  /** Formatted price for the fixture add-on, e.g. "€39". */
  fixturePrice?: string;
  /** Pre-optimised board set image (brand/home-set.png). */
  boardSetImage?: BoardSetImage;
}

export default function VariantPicker({ product, fixtureVariantId, fixturePrice, boardSetImage }: Props) {
  // Init selections from URL query params or first variant's options
  const initSelections: Record<string, string> = {};
  if (product.variants.length > 0) {
    for (const opt of product.variants[0].selectedOptions) {
      initSelections[opt.name] = opt.value;
    }
  } else {
    for (const opt of product.options) {
      if (opt.values.length > 0) initSelections[opt.name] = opt.values[0];
    }
  }
  // Override from query params (e.g. ?size=300x200&dictionary=DICT_6X6_250)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    for (const opt of product.options) {
      const qVal = params.get(opt.name.toLowerCase());
      if (qVal) {
        // Find matching option value (case-insensitive, × / x normalized)
        const normalize = (s: string) => s.toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '');
        const match = opt.values.find((v) => normalize(v) === normalize(qVal));
        if (match) initSelections[opt.name] = match;
      }
    }
  }

  const [selections, setSelections] = useState(initSelections);
  const [quantity, setQuantity] = useState(1);
  const [addFixture, setAddFixture] = useState(false);
  const [busy, setBusy] = useState<'add' | 'buy' | false>(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [boardCount, setBoardCount] = useState(1);
  const [boardStartIds, setBoardStartIds] = useState<number[]>([]);

  const variant = findVariant(product.variants, selections);

  // Dispatch variant-changed for MobileBottomCluster
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('variant-changed', {
      detail: {
        variantId: variant?.id,
        price: variant?.price ?? product.priceFrom,
        available: variant?.availableForSale ?? false,
      },
    }));
  }, [variant?.id, variant?.price, variant?.availableForSale, product.priceFrom]);

  // Listen for select-size from ordering table row clicks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const size = (e as CustomEvent).detail?.size;
      if (!size) return;
      // Find a Size option value that starts with the given size prefix
      const sizeOpt = product.options.find((o) => o.name === 'Size');
      if (!sizeOpt) return;
      const match = sizeOpt.values.find((v) => v.startsWith(size));
      if (match) handleSelect('Size', match);
    };
    window.addEventListener('select-size', handler);
    return () => window.removeEventListener('select-size', handler);
  }, [product.options]);

  // Determine if this is a board-set-eligible product
  const isCharuco = product.handle.includes('charuco') || product.handle.includes('aruco');
  const isAprilGrid = product.handle.includes('aprilgrid');
  const isBoardProduct = isCharuco || isAprilGrid;

  // Selected size and dictionary from variant options
  const selectedSize = selections['Size'] ?? '';
  const selectedDict = selections['Dictionary'] ?? '';

  // Look up grid geometry from boardSizes (not from product metafields)
  const sizeInfo = useMemo(() => {
    if (!isBoardProduct || !selectedSize) return null;
    if (isAprilGrid) {
      const ag = findAprilGridSize(selectedSize);
      return ag ? { kind: 'aprilgrid' as const, ...ag } : null;
    }
    const ch = findCharucoSize(selectedSize);
    return ch ? { kind: 'charuco' as const, ...ch } : null;
  }, [isBoardProduct, isAprilGrid, selectedSize]);

  // Board-set error when selected size is not in boardSizes
  const boardSizeError = isBoardProduct && selectedSize && !sizeInfo
    ? `Unknown size "${selectedSize}" — board set unavailable`
    : '';

  // Number of markers the selected size needs (for dictionary validation)
  const markersNeeded = useMemo(() => {
    if (!sizeInfo) return 0;
    return markerCount(sizeInfo.kind, sizeInfo.rows, sizeInfo.cols);
  }, [sizeInfo]);

  // Check if a dictionary option value has enough markers for the selected size
  const isDictDisabled = (dictValue: string): string | null => {
    if (!sizeInfo || markersNeeded === 0) return null;
    const count = dictMarkerCount(dictValue);
    if (count === null) return null; // unknown dict — allow it
    if (count < markersNeeded) return `${dictValue} has ${count} markers; this size needs ${markersNeeded}`;
    return null;
  };

  // Compute boards from the selected variant's geometry
  const boards = useMemo(() => {
    if (!sizeInfo || boardCount <= 1) return null;
    if (sizeInfo.kind === 'aprilgrid') {
      const spec = {
        type: 'AprilGrid (Kalibr)' as const,
        rows: sizeInfo.rows, cols: sizeInfo.cols,
        square: sizeInfo.tagSize, marker: sizeInfo.tagSize,
        dict: 'DICT_APRILTAG_36h11',
        aprilFamily: '36h11',
        tagSpacing: sizeInfo.gap / sizeInfo.tagSize,
        paper: 'A4', startId: 0, scaleBar: true,
      };
      return computeSetBoards(spec, boardCount, boardStartIds.length >= boardCount ? boardStartIds : undefined);
    }
    const spec = {
      type: 'ChArUco' as const,
      rows: sizeInfo.rows, cols: sizeInfo.cols,
      square: sizeInfo.square, marker: sizeInfo.marker,
      dict: selectedDict || 'DICT_6X6_250',
      paper: 'A4', startId: 0, scaleBar: true,
    };
    return computeSetBoards(spec, boardCount, boardStartIds.length >= boardCount ? boardStartIds : undefined);
  }, [boardCount, boardStartIds, sizeInfo, selectedDict]);

  // Clear confirmation timer on unmount
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  const handleSelect = (name: string, value: string) => {
    setSelections((prev) => ({ ...prev, [name]: value }));
  };

  /** Shared logic: add lines to existing or new cart. Returns checkoutUrl + totalQuantity. */
  const addToCart = async () => {
    if (!variant) throw new Error('No variant selected');
    const addons: string[] = [];
    if (addFixture && fixtureVariantId) addons.push(fixtureVariantId);
    const lines = buildCartLines(variant.id, quantity, addons);

    const existingCartId = getStoredCartId();
    let checkoutUrl: string;
    let totalQuantity: number;

    if (existingCartId) {
      try {
        const result = await cartLinesAdd(existingCartId, lines);
        checkoutUrl = result.checkoutUrl;
        totalQuantity = result.totalQuantity;
      } catch {
        const result = await cartCreate(lines);
        setStoredCartId(result.cartId);
        // Re-fetch to get totalQuantity
        checkoutUrl = result.checkoutUrl;
        totalQuantity = quantity + addons.length * quantity;
      }
    } else {
      const result = await cartCreate(lines);
      setStoredCartId(result.cartId);
      checkoutUrl = result.checkoutUrl;
      totalQuantity = quantity + addons.length * quantity;
    }

    dispatchCartUpdated();
    return { checkoutUrl, totalQuantity };
  };

  const handleAddToCart = async () => {
    setBusy('add');
    setError('');
    setConfirmation('');
    try {
      if (boardCount >= 2 && boards && variant && sizeInfo) {
        // Multi-board set: one cart line with quantity = boardCount × userQuantity
        const dict = isAprilGrid ? 'DICT_APRILTAG_36h11' : selectedDict;
        const maxMarkers = dictMarkerCount(dict);

        // Read existing cart to find continuation start ID
        const existingCartId = getStoredCartId();
        let cart = existingCartId ? await cartQuery(existingCartId) : null;
        const prevEnd = highestEndId(cart, variant.id);
        const contStart = prevEnd >= 0 ? prevEnd + 1 : 0;

        // Compute boards from continuation start
        const setBoards = computeSetBoards(
          { ...boards[0].spec, startId: contStart },
          boardCount,
        );

        // Check dictionary overflow
        const lastId = setBoards[setBoards.length - 1].idRange.max;
        if (maxMarkers !== null && lastId >= maxMarkers) {
          setError(`ID ${lastId} exceeds ${dict} (${maxMarkers} markers). Use 5+ / custom start IDs or contact us.`);
          setBusy(false);
          return;
        }

        const idRanges = setBoards.map(b => `${b.idRange.min}\u2013${b.idRange.max}`);
        const line = buildSetCartLine(variant.id, boardCount, quantity, contStart, idRanges);

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
        setConfirmation(`Added set of ${boardCount} boards to cart`);
        if (confirmTimer.current) clearTimeout(confirmTimer.current);
        confirmTimer.current = setTimeout(() => setConfirmation(''), 3000);
        window.dispatchEvent(new Event('open-cart-drawer'));
      } else {
        // Single board — existing flow
        const { totalQuantity } = await addToCart();
        setConfirmation(`Added — ${totalQuantity} item${totalQuantity !== 1 ? 's' : ''} in cart`);
        if (confirmTimer.current) clearTimeout(confirmTimer.current);
        confirmTimer.current = setTimeout(() => setConfirmation(''), 3000);
        window.dispatchEvent(new Event('open-cart-drawer'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setBusy(false);
    }
  };

  const handleBuyNow = async () => {
    setBusy('buy');
    setError('');
    setConfirmation('');
    try {
      const { checkoutUrl } = await addToCart();
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="spec text-4xl font-extrabold">{variant?.price ?? product.priceFrom}</span>
        {variant && !variant.availableForSale && (
          <span className="text-sm text-brand">Out of stock</span>
        )}
        <span className="text-sm text-ink-soft">excl. VAT · shipping calculated at checkout</span>
      </div>

      {/* Option selectors */}
      {product.options.map((opt) => {
        const isDictOpt = opt.name === 'Dictionary';
        return (
          <fieldset key={opt.name} className="flex flex-col gap-2.5 border-0 p-0">
            <legend className="text-[13px] font-semibold">{opt.name}</legend>
            <div className="flex flex-wrap gap-2">
              {opt.values.map((val) => {
                const disabledHint = isDictOpt ? isDictDisabled(val) : null;
                const isDisabled = !!disabledHint;
                return (
                  <label
                    key={val}
                    className={`rounded border px-3.5 py-2.5 text-sm ${
                      isDisabled
                        ? 'cursor-not-allowed border-line text-ink-muted opacity-50'
                        : selections[opt.name] === val
                          ? 'cursor-pointer border-2 border-brand font-semibold'
                          : 'cursor-pointer border-line font-medium'
                    }`}
                    title={disabledHint ?? undefined}
                    aria-disabled={isDisabled || undefined}
                  >
                    <input
                      type="radio"
                      name={opt.name}
                      value={val}
                      checked={selections[opt.name] === val}
                      disabled={isDisabled}
                      onChange={() => handleSelect(opt.name, val)}
                      className="sr-only"
                    />
                    {val}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {/* Board set */}
      {isBoardProduct && (
        <fieldset className="flex flex-col gap-2.5 border-0 p-0" disabled={!!boardSizeError}>
          <legend className="text-[13px] font-semibold">Board set</legend>
          {boardSizeError && <p className="m-0 text-sm text-brand">{boardSizeError}</p>}
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map(n => (
              <label key={n} className={`cursor-pointer rounded border px-3.5 py-2.5 text-sm ${
                boardCount === n ? 'border-2 border-brand font-semibold' : 'border-line font-medium'
              }`}>
                <input type="radio" name="boardCount" value={n}
                  checked={boardCount === n}
                  onChange={() => { setBoardCount(n); setBoardStartIds([]); }}
                  className="sr-only" />
                {n === 1 ? '1 board' : `${n} boards`}
              </label>
            ))}
            <input type="number" min={5} max={16}
              placeholder="5+"
              className={`w-16 rounded border px-2 py-2.5 text-center text-sm ${boardCount > 4 ? 'border-2 border-brand font-semibold' : 'border-line'}`}
              value={boardCount > 4 ? boardCount : ''}
              onChange={(e) => {
                const n = Math.max(1, Math.min(16, +e.target.value));
                setBoardCount(n);
                setBoardStartIds([]);
              }} />
          </div>
          {boardSetImage && boardCount >= 2 && (
            <img
              src={boardSetImage.src}
              srcSet={boardSetImage.srcset}
              sizes="(max-width: 640px) 100vw, 420px"
              width={boardSetImage.width}
              height={boardSetImage.height}
              alt="Calib.Tools set of four ChArUco calibration boards with consecutive marker ID ranges arranged in a 2 by 2 grid, seen from above."
              className="w-full rounded-lg"
              loading="lazy"
              decoding="async"
            />
          )}
          {boards && boards.length >= 2 && (
            <div className="rounded border border-line bg-ground-panel p-3 text-sm">
              {boards.map(b => (
                <div key={b.index} className="flex items-center justify-between gap-3 py-0.5">
                  <span>Board {b.index + 1}</span>
                  <input type="number" min={0}
                    className="w-16 rounded border border-line bg-white px-1.5 py-0.5 text-center text-sm font-mono"
                    value={b.startId}
                    onChange={(e) => {
                      const ids = boards.map(bb => bb.startId);
                      ids[b.index] = Math.max(0, +e.target.value);
                      setBoardStartIds(ids);
                    }} />
                  <span className="font-mono text-ink-muted">IDs {b.idRange.min}{'\u2013'}{b.idRange.max}</span>
                </div>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {/* Add-ons */}
      {fixtureVariantId && (
        <fieldset className="flex flex-col gap-2.5 border-0 p-0">
          <legend className="text-[13px] font-semibold">Add-ons</legend>
          <label className="flex items-center gap-2.5 text-[15px] min-h-[44px] md:min-h-0">
            <input type="checkbox" className="h-[18px] w-[18px]" checked={addFixture} onChange={(e) => setAddFixture(e.target.checked)} />
            Target Mounting Fixture, ¼″-20 {fixturePrice && <span className="text-ink-soft">+ {fixturePrice}</span>}
          </label>
        </fieldset>
      )}

      {/* Quantity + buttons */}
      <div className="flex gap-3 pt-1.5">
        <div className="flex items-center rounded border border-line">
          <button
            type="button"
            aria-label="Decrease quantity"
            className="flex h-[44px] w-[44px] items-center justify-center text-lg font-semibold text-ink-muted hover:text-ink disabled:opacity-40"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          ><Minus size={16} strokeWidth={1.6} aria-hidden="true" /></button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, +e.target.value))}
            aria-label="Quantity"
            className="h-[44px] w-[40px] border-x border-line bg-white text-center text-[15px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="Increase quantity"
            className="flex h-[44px] w-[44px] items-center justify-center text-lg font-semibold text-ink-muted hover:text-ink"
            onClick={() => setQuantity((q) => q + 1)}
          ><Plus size={16} strokeWidth={1.6} aria-hidden="true" /></button>
        </div>
        <button
          type="button"
          className="flex-1 rounded bg-brand py-3.5 text-base font-semibold text-white disabled:opacity-50"
          disabled={!!busy || !variant || !variant.availableForSale}
          onClick={handleAddToCart}
        >
          {busy === 'add' ? 'Adding…' : 'Add to cart'}
        </button>
      </div>
      <button
        type="button"
        className="rounded border-2 border-brand py-3 text-base font-semibold text-brand disabled:opacity-50"
        disabled={!!busy || !variant || !variant.availableForSale}
        onClick={handleBuyNow}
      >
        {busy === 'buy' ? 'Redirecting…' : 'Buy now'}
      </button>

      {/* Selected variant part number */}
      {variant?.sku && (
        <span className="font-mono text-sm text-ink-muted" data-testid="variant-sku">{variant.sku}</span>
      )}

      {confirmation && <p className="m-0 text-sm font-medium text-green-700">{confirmation}</p>}
      {error && <p className="m-0 text-sm text-brand">{error}</p>}

      <a href="/quote/" className="text-sm text-ink-soft no-underline hover:text-ink min-h-[24px] inline-flex items-center gap-1">Need a quote or invoice/PO? <ArrowRight size={14} strokeWidth={1.6} aria-hidden="true" /></a>

      <div className="grid grid-cols-2 gap-3 pt-2 text-sm text-ink-muted">
        <span className="flex items-center gap-1.5"><Check size={18} strokeWidth={1.6} className="shrink-0 text-brand" aria-hidden="true" /> {LEAD_TIME}</span>
        <span className="flex items-center gap-1.5"><Check size={18} strokeWidth={1.6} className="shrink-0 text-brand" aria-hidden="true" /> {INSPECTION_CLAIM_SHORT}</span>
        <span className="flex items-center gap-1.5"><Check size={18} strokeWidth={1.6} className="shrink-0 text-brand" aria-hidden="true" /> 30-day returns</span>
        <span className="flex items-center gap-1.5"><Check size={18} strokeWidth={1.6} className="shrink-0 text-brand" aria-hidden="true" /> Volume pricing from 5 pcs</span>
      </div>
    </div>
  );
}
