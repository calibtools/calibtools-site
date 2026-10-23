import { useState, useEffect } from 'react';
import {
  cartCreate, cartLinesAdd, dispatchCartUpdated,
  getStoredCartId, setStoredCartId,
} from '@/lib/shopify';

interface Props {
  defaultPrice: string;
}

export default function StickyBottomBar({ defaultPrice }: Props) {
  const [visible, setVisible] = useState(false);
  const [variantId, setVariantId] = useState<string | undefined>();
  const [price, setPrice] = useState(defaultPrice);
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);

  // Listen for variant-changed events from VariantPicker
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setVariantId(detail.variantId);
        setPrice(detail.price ?? defaultPrice);
        setAvailable(detail.available ?? true);
      }
    };
    window.addEventListener('variant-changed', handler);
    return () => window.removeEventListener('variant-changed', handler);
  }, [defaultPrice]);

  // IntersectionObserver on buy box
  useEffect(() => {
    const buyBox = document.querySelector('[data-buy-box]');
    if (!buyBox) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(buyBox);
    return () => observer.disconnect();
  }, []);

  const handleAdd = async () => {
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
      // Silent fail — drawer won't open
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-ground p-4 md:hidden">
      <button
        type="button"
        onClick={handleAdd}
        disabled={busy || !variantId || !available}
        className="flex h-12 w-full items-center justify-center rounded bg-brand text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? 'Adding…' : `Add to cart \u00B7 ${price}`}
      </button>
    </div>
  );
}
