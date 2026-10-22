import { useEffect, useState } from 'react';
import { getCartQuantity, getStoredCartId } from '@/lib/shopify';

/**
 * Cart count badge — reads cart id from localStorage and shows item count.
 * Listens for 'cart-updated' events dispatched by VariantPicker.
 */
export default function CartBadge() {
  const [count, setCount] = useState(0);

  const refresh = async () => {
    const cartId = getStoredCartId();
    if (!cartId) { setCount(0); return; }
    const qty = await getCartQuantity(cartId);
    setCount(qty);
  };

  useEffect(() => {
    refresh();
    window.addEventListener('cart-updated', refresh);
    return () => window.removeEventListener('cart-updated', refresh);
  }, []);

  if (count === 0) return null;

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
      {count}
    </span>
  );
}
