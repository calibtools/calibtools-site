import { useState, useEffect } from 'react';
import { ShoppingCart } from '@/lib/icons';
import {
  cartCreate, cartLinesAdd, dispatchCartUpdated,
  getStoredCartId, setStoredCartId,
} from '@/lib/shopify';

interface Props {
  mode: 'shop' | 'add-to-cart';
  defaultPrice?: string;
}

export default function MobileBottomCluster({ mode, defaultPrice }: Props) {
  const [variantId, setVariantId] = useState<string | undefined>();
  const [price, setPrice] = useState(defaultPrice ?? '');
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);

  // Sync cart count
  useEffect(() => {
    const update = () => {
      try {
        const raw = localStorage.getItem('calib-cart-count');
        setCount(raw ? parseInt(raw, 10) || 0 : 0);
      } catch { /* noop */ }
    };
    update();
    const onCart = () => update();
    const onStorage = (e: StorageEvent) => { if (e.key === 'calib-cart-count') update(); };
    window.addEventListener('cart-updated', onCart);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('cart-updated', onCart);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Listen for variant-changed on product pages
  useEffect(() => {
    if (mode !== 'add-to-cart') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setVariantId(detail.variantId);
        setPrice(detail.price ?? defaultPrice ?? '');
        setAvailable(detail.available ?? true);
      }
    };
    window.addEventListener('variant-changed', handler);
    return () => window.removeEventListener('variant-changed', handler);
  }, [mode, defaultPrice]);

  const handleAddToCart = async () => {
    if (!variantId || !available) return;
    setBusy(true);
    try {
      const line = { merchandiseId: variantId, quantity: 1 };
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
      // Silent fail
    } finally {
      setBusy(false);
    }
  };

  const openCart = () => {
    window.dispatchEvent(new Event('open-cart-drawer'));
  };

  return (
    <div className="fixed bottom-3 right-3 z-30 flex flex-col items-end gap-2 md:hidden">
      {/* Cart button */}
      <button
        type="button"
        onClick={openCart}
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/10 shadow-lg backdrop-blur-md"
        style={{ backgroundColor: 'rgba(10,10,10,0.82)' }}
        aria-label={`Cart${count > 0 ? ` (${count} items)` : ''}`}
      >
        <ShoppingCart size={20} strokeWidth={1.6} color="white" aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {/* Action pill */}
      {mode === 'shop' ? (
        <a
          href="/targets/"
          className="btn-md btn-primary rounded-full shadow-lg"
        >
          Shop targets
        </a>
      ) : (
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={busy || !variantId || !available}
          className="btn-md btn-primary rounded-full shadow-lg disabled:opacity-50"
        >
          {busy ? 'Adding\u2026' : `Add to cart \u00B7 ${price}`}
        </button>
      )}
    </div>
  );
}
