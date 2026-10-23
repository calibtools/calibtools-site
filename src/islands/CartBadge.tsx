import { useEffect, useState } from 'react';
import { getCartQuantity, getStoredCartId } from '@/lib/shopify';

/**
 * Cart count badge — reads cart id from localStorage and shows item count.
 * Listens for 'cart-updated' events dispatched after cart mutations.
 * Also updates the aria-label on the parent [data-open-cart] button.
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
    const handleUpdate = () => refresh();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'calib-cart-id') refresh();
    };
    window.addEventListener('cart-updated', handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('cart-updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Update parent button aria-label
  useEffect(() => {
    const btn = document.querySelector('[data-open-cart]');
    if (btn) {
      btn.setAttribute('aria-label', count > 0 ? `Open cart, ${count} item${count !== 1 ? 's' : ''}` : 'Open cart');
    }
  }, [count]);

  if (count === 0) return null;

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
      {count}
    </span>
  );
}
