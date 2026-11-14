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
  const [hidden, setHidden] = useState(mode === 'add-to-cart');

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

  // Hide floating ATC while the in-page ATC button is visible
  useEffect(() => {
    if (mode !== 'add-to-cart') return;
    const buyBox = document.querySelector('[data-buy-box]');
    if (!buyBox) { setHidden(false); return; }
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(buyBox);
    return () => observer.disconnect();
  }, [mode]);

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
    // Full-width opaque bar on phones: content scrolls behind it instead of being covered by floating
    // buttons. It fades out when the footer comes into view (Base.astro), so nothing stays hidden under it.
    <div data-mobile-cluster className={`fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-line bg-ground px-5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden transition-opacity ${hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Cart button */}
      <button
        type="button"
        onClick={openCart}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded border border-ink bg-ink"
        aria-label={`Cart${count > 0 ? ` (${count} items)` : ''}`}
      >
        <ShoppingCart size={18} strokeWidth={1.6} color="white" aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[12px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {/* Action pill */}
      {mode === 'shop' ? (
        <a
          href="/targets/"
          className="btn-md btn-primary flex-1"
        >
          Shop targets
        </a>
      ) : (
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={busy || !variantId || !available}
          className="btn-md btn-primary flex-1 disabled:opacity-50"
        >
          {busy ? 'Adding\u2026' : `Add to cart \u00B7 ${price}`}
        </button>
      )}
    </div>
  );
}
