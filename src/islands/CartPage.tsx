import { useEffect, useState, useCallback } from 'react';
import {
  cartQuery, cartLinesUpdate, cartLinesRemove, formatPrice,
  getStoredCartId,
  type Cart, type CartLineItem,
} from '@/lib/shopify';

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    const cartId = getStoredCartId();
    if (!cartId) { setCart(null); setLoading(false); return; }
    const c = await cartQuery(cartId);
    setCart(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshCart();
    const handler = () => refreshCart();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'calib-cart-id') refreshCart();
    };
    window.addEventListener('cart-updated', handler);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('cart-updated', handler);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshCart]);

  const handleUpdateQty = async (lineId: string, quantity: number) => {
    const cartId = getStoredCartId();
    if (!cartId) return;
    setBusy(lineId);
    try {
      if (quantity <= 0) {
        const updated = await cartLinesRemove(cartId, [lineId]);
        setCart(updated);
      } else {
        const updated = await cartLinesUpdate(cartId, [{ id: lineId, quantity }]);
        setCart(updated);
      }
    } catch { /* will refresh */ }
    setBusy(null);
  };

  const handleRemove = async (lineId: string) => {
    const cartId = getStoredCartId();
    if (!cartId) return;
    setBusy(lineId);
    try {
      const updated = await cartLinesRemove(cartId, [lineId]);
      setCart(updated);
    } catch { /* will refresh */ }
    setBusy(null);
  };

  if (loading) {
    return <p className="py-12 text-center text-ink-muted">Loading cart...</p>;
  }

  const lines = cart?.lines ?? [];
  const isEmpty = lines.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-soft" aria-hidden="true">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <a href="/targets/" className="text-sm font-semibold text-brand hover:text-brand-dark">
          Browse targets →
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="pb-8 text-2xl font-bold">Cart</h1>

      {/* Header row (desktop) */}
      <div className="hidden border-b border-line pb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted md:grid md:grid-cols-[1fr_120px_140px_100px]">
        <span>Product</span>
        <span className="text-center">Price</span>
        <span className="text-center">Quantity</span>
        <span className="text-right">Total</span>
      </div>

      <ul className="divide-y divide-line">
        {lines.map((line) => (
          <CartLineRow
            key={line.id}
            line={line}
            busy={busy === line.id}
            onUpdateQty={(qty) => handleUpdateQty(line.id, qty)}
            onRemove={() => handleRemove(line.id)}
          />
        ))}
      </ul>

      {/* Footer */}
      <div className="flex flex-col items-end gap-4 border-t border-line pt-6">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">Subtotal</span>
          <span className="spec text-2xl font-bold" data-testid="cart-subtotal">
            {formatPrice(cart!.cost.subtotalAmount.amount, cart!.cost.subtotalAmount.currencyCode)}
          </span>
        </div>
        <p className="text-sm text-ink-soft">VAT and shipping calculated at checkout</p>
        <div className="flex gap-3">
          <a href="/targets/" className="flex h-12 items-center justify-center rounded border border-line px-6 text-base font-medium text-ink hover:bg-ground-panel">
            Continue shopping
          </a>
          <a
            href={cart!.checkoutUrl}
            className="flex h-12 items-center justify-center rounded bg-brand px-8 text-base font-semibold text-white hover:bg-brand-dark"
          >
            Checkout
          </a>
        </div>
      </div>
    </div>
  );
}

function CartLineRow({
  line, busy, onUpdateQty, onRemove,
}: {
  line: CartLineItem;
  busy: boolean;
  onUpdateQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const { merchandise } = line;
  const unitPrice = formatPrice(merchandise.price.amount, merchandise.price.currencyCode);
  const lineTotal = formatPrice(line.cost.totalAmount.amount, line.cost.totalAmount.currencyCode);

  return (
    <li className="flex gap-4 py-5 md:grid md:grid-cols-[1fr_120px_140px_100px] md:items-center" data-testid="cart-line">
      {/* Product info */}
      <div className="flex gap-4">
        {merchandise.image ? (
          <img
            src={merchandise.image.url}
            alt={merchandise.image.altText ?? merchandise.product.title}
            className="h-20 w-20 rounded border border-line object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded border border-line bg-ground-panel text-ink-soft">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <a href={`/targets/${merchandise.product.handle}/`} className="text-sm font-semibold text-ink no-underline hover:text-brand">
            {merchandise.product.title}
          </a>
          <span className="text-xs text-ink-muted">
            {merchandise.title}
            {line.attributes.find(a => a.key === 'id_range') && (
              <> · IDs {line.attributes.find(a => a.key === 'id_range')!.value}</>
            )}
          </span>
          {merchandise.sku && <span className="font-mono text-xs text-ink-soft">{merchandise.sku}</span>}
          <button type="button" onClick={onRemove} disabled={busy} className="mt-1 w-fit text-xs text-ink-soft hover:text-brand disabled:opacity-40">
            Remove
          </button>
        </div>
      </div>

      {/* Unit price */}
      <span className="spec hidden text-center text-sm md:block">{unitPrice}</span>

      {/* Quantity stepper */}
      <div className="flex justify-center">
        <div className="flex items-center rounded border border-line">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={busy}
            onClick={() => onUpdateQty(line.quantity - 1)}
            className="flex h-[44px] w-[44px] items-center justify-center text-lg font-semibold text-ink-muted hover:text-ink disabled:opacity-40"
          >−</button>
          <span className="w-8 text-center text-sm" data-testid="line-quantity">{line.quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={busy}
            onClick={() => onUpdateQty(line.quantity + 1)}
            className="flex h-[44px] w-[44px] items-center justify-center text-lg font-semibold text-ink-muted hover:text-ink disabled:opacity-40"
          >+</button>
        </div>
      </div>

      {/* Line total */}
      <span className="spec text-right text-sm font-semibold">{lineTotal}</span>
    </li>
  );
}
