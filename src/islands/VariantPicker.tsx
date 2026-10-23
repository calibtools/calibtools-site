import { useState } from 'react';
import {
  findVariant, buildCartLines, cartCreate, cartLinesAdd,
  getStoredCartId, setStoredCartId,
  type Product,
} from '@/lib/shopify';

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
  // Init selections from first variant's options
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

  const [selections, setSelections] = useState(initSelections);
  const [quantity, setQuantity] = useState(1);
  const [addCert, setAddCert] = useState(false);
  const [addFixture, setAddFixture] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const variant = findVariant(product.variants, selections);

  const handleSelect = (name: string, value: string) => {
    setSelections((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddToCart = async () => {
    if (!variant) return;
    setBusy(true);
    setError('');

    try {
      const addons: string[] = [];
      if (addCert && certVariantId) addons.push(certVariantId);
      if (addFixture && fixtureVariantId) addons.push(fixtureVariantId);
      const lines = buildCartLines(variant.id, quantity, addons);

      const existingCartId = getStoredCartId();
      let checkoutUrl: string;

      if (existingCartId) {
        try {
          const result = await cartLinesAdd(existingCartId, lines);
          checkoutUrl = result.checkoutUrl;
        } catch {
          // Cart expired, create new one
          const result = await cartCreate(lines);
          setStoredCartId(result.cartId);
          checkoutUrl = result.checkoutUrl;
        }
      } else {
        const result = await cartCreate(lines);
        setStoredCartId(result.cartId);
        checkoutUrl = result.checkoutUrl;
      }

      // Dispatch event so CartBadge updates
      window.dispatchEvent(new Event('cart-updated'));
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-extrabold">{variant?.price ?? product.priceFrom}</span>
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

      {/* Quantity + Buy now */}
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
          disabled={busy || !variant || !variant.availableForSale}
          onClick={handleAddToCart}
        >
          {busy ? 'Redirecting…' : 'Buy now'}
        </button>
      </div>

      {error && <p className="m-0 text-sm text-brand">{error}</p>}

      <div className="grid grid-cols-2 gap-3 pt-2 text-sm text-ink-muted">
        <span>✓ Ships in 1–2 days, 2–4 days in EU</span>
        <span>✓ Inspection report included</span>
        <span>✓ 30-day returns</span>
        <span>✓ Volume pricing from 5 pcs</span>
      </div>
    </div>
  );
}
