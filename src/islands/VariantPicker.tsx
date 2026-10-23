import { useState, useEffect, useRef, useMemo } from 'react';
import {
  findVariant, buildCartLines, cartCreate, cartLinesAdd,
  getStoredCartId, setStoredCartId, dispatchCartUpdated,
  type Product,
} from '@/lib/shopify';
import { computeSetBoards } from '@/lib/exportSet';

interface Props {
  product: Product;
  /** Variant ID for the ILAC certificate add-on. */
  certVariantId?: string;
  /** Variant ID for the mounting fixture add-on. */
  fixtureVariantId?: string;
  /** Formatted price for the certificate add-on, e.g. "€149". */
  certPrice?: string;
  /** Formatted price for the fixture add-on, e.g. "€39". */
  fixturePrice?: string;
}

export default function VariantPicker({ product, certVariantId, fixtureVariantId, certPrice, fixturePrice }: Props) {
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
        // Find matching option value (case-insensitive, × / x normalised)
        const normalise = (s: string) => s.toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '');
        const match = opt.values.find((v) => normalise(v) === normalise(qVal));
        if (match) initSelections[opt.name] = match;
      }
    }
  }

  const [selections, setSelections] = useState(initSelections);
  const [quantity, setQuantity] = useState(1);
  const [addCert, setAddCert] = useState(false);
  const [addFixture, setAddFixture] = useState(false);
  const [busy, setBusy] = useState<'add' | 'buy' | false>(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [boardCount, setBoardCount] = useState(1);
  const [boardStartIds, setBoardStartIds] = useState<number[]>([]);

  const variant = findVariant(product.variants, selections);

  // Determine if this is a board-set-eligible product
  const isBoardProduct = product.handle.includes('charuco') || product.handle.includes('aprilgrid') || product.handle.includes('aruco');

  // Compute boards using product metafields for pattern params
  const boards = useMemo(() => {
    if (!isBoardProduct || boardCount <= 1) return null;
    const squares = product.metafields.squares ?? '10x7';
    const cols = parseInt(squares.split('x')[0], 10) || 10;
    const rows = parseInt(squares.split('x')[1], 10) || 7;
    const spec = {
      type: 'ChArUco' as const,
      rows, cols,
      square: parseFloat(product.metafields.square_size_mm ?? '25'),
      marker: parseFloat(product.metafields.marker_size_mm ?? '18'),
      dict: product.metafields.dictionary ?? 'DICT_6X6_250',
      paper: 'A4', startId: 0, scaleBar: true,
    };
    return computeSetBoards(spec, boardCount, boardStartIds.length >= boardCount ? boardStartIds : undefined);
  }, [boardCount, boardStartIds, product.metafields, isBoardProduct]);

  // Clear confirmation timer on unmount
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  const handleSelect = (name: string, value: string) => {
    setSelections((prev) => ({ ...prev, [name]: value }));
  };

  /** Shared logic: add lines to existing or new cart. Returns checkoutUrl + totalQuantity. */
  const addToCart = async () => {
    if (!variant) throw new Error('No variant selected');
    const addons: string[] = [];
    if (addCert && certVariantId) addons.push(certVariantId);
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
      if (boardCount >= 2 && boards && variant) {
        // Multi-board: add each board as a separate line with attributes
        const existingCartId = getStoredCartId();
        if (!existingCartId) {
          // Create cart with first board
          const attrs = [
            { key: 'start_id', value: String(boards[0].startId) },
            { key: 'id_range', value: `${boards[0].idRange.min}\u2013${boards[0].idRange.max}` },
          ];
          const lines = buildCartLines(variant.id, quantity, [], attrs);
          const result = await cartCreate(lines);
          setStoredCartId(result.cartId);

          // Add remaining boards
          for (let i = 1; i < boards.length; i++) {
            const boardAttrs = [
              { key: 'start_id', value: String(boards[i].startId) },
              { key: 'id_range', value: `${boards[i].idRange.min}\u2013${boards[i].idRange.max}` },
            ];
            const boardLines = buildCartLines(variant.id, quantity, [], boardAttrs);
            await cartLinesAdd(result.cartId, boardLines);
          }
        } else {
          for (const board of boards) {
            const attrs = [
              { key: 'start_id', value: String(board.startId) },
              { key: 'id_range', value: `${board.idRange.min}\u2013${board.idRange.max}` },
            ];
            const boardLines = buildCartLines(variant.id, quantity, [], attrs);
            await cartLinesAdd(existingCartId, boardLines);
          }
        }
        dispatchCartUpdated();
        setConfirmation(`Added ${boards.length} boards to cart`);
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
        <span className="text-sm text-ink-soft">excl. VAT · free EU shipping over €150</span>
      </div>

      {/* Option selectors */}
      {product.options.map((opt) => (
        <fieldset key={opt.name} className="flex flex-col gap-2.5 border-0 p-0">
          <legend className="text-[13px] font-semibold">{opt.name}</legend>
          <div className="flex flex-wrap gap-2">
            {opt.values.map((val) => (
              <label
                key={val}
                className={`cursor-pointer rounded border px-3.5 py-2.5 text-sm ${
                  selections[opt.name] === val
                    ? 'border-2 border-brand font-semibold'
                    : 'border-line font-medium'
                }`}
              >
                <input
                  type="radio"
                  name={opt.name}
                  value={val}
                  checked={selections[opt.name] === val}
                  onChange={() => handleSelect(opt.name, val)}
                  className="sr-only"
                />
                {val}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {/* Board set */}
      {isBoardProduct && (
        <fieldset className="flex flex-col gap-2.5 border-0 p-0">
          <legend className="text-[13px] font-semibold">Board set</legend>
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
      {(certVariantId || fixtureVariantId) && (
        <fieldset className="flex flex-col gap-2.5 border-0 p-0">
          <legend className="text-[13px] font-semibold">Add-ons</legend>
          {certVariantId && (
            <label className="flex items-center gap-2.5 text-[15px]">
              <input type="checkbox" className="h-[18px] w-[18px]" checked={addCert} onChange={(e) => setAddCert(e.target.checked)} />
              ILAC-recognised calibration certificate {certPrice && <span className="text-ink-soft">+ {certPrice}</span>}
            </label>
          )}
          {fixtureVariantId && (
            <label className="flex items-center gap-2.5 text-[15px]">
              <input type="checkbox" className="h-[18px] w-[18px]" checked={addFixture} onChange={(e) => setAddFixture(e.target.checked)} />
              Mounting fixture, ¼″ thread {fixturePrice && <span className="text-ink-soft">+ {fixturePrice}</span>}
            </label>
          )}
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
          >−</button>
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
          >+</button>
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

      <a href="/quote/" className="text-sm text-ink-soft no-underline hover:text-ink">Need a quote or invoice/PO? →</a>

      <div className="grid grid-cols-2 gap-3 pt-2 text-sm text-ink-muted">
        <span>✓ Ships in 1–2 days, 2–4 days in EU</span>
        <span>✓ Inspection report included</span>
        <span>✓ 30-day returns</span>
        <span>✓ Volume pricing from 5 pcs</span>
      </div>
    </div>
  );
}
