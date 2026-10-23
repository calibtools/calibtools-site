import { useEffect, useRef, useState, useCallback } from 'react';
import {
  cartQuery, cartLinesUpdate, cartLinesRemove, formatPrice,
  getStoredCartId,
  type Cart, type CartLineItem,
} from '@/lib/shopify';

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // line id being mutated
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const refreshCart = useCallback(async () => {
    const cartId = getStoredCartId();
    if (!cartId) { setCart(null); return; }
    const c = await cartQuery(cartId);
    setCart(c);
  }, []);

  // Listen for open-cart-drawer and cart-updated events
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    const handleCartUpdated = () => { refreshCart(); };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'calib-cart-id') refreshCart();
    };

    window.addEventListener('open-cart-drawer', handleOpen);
    window.addEventListener('cart-updated', handleCartUpdated);
    window.addEventListener('storage', handleStorage);
    // Initial load
    refreshCart();

    return () => {
      window.removeEventListener('open-cart-drawer', handleOpen);
      window.removeEventListener('cart-updated', handleCartUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshCart]);

  // Focus trap + body scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

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
    } catch { /* ignore — cart will refresh */ }
    setBusy(null);
  };

  const handleRemove = async (lineId: string) => {
    const cartId = getStoredCartId();
    if (!cartId) return;
    setBusy(lineId);
    try {
      const updated = await cartLinesRemove(cartId, [lineId]);
      setCart(updated);
    } catch { /* ignore */ }
    setBusy(null);
  };

  const lines = cart?.lines ?? [];
  const isEmpty = lines.length === 0;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal={open}
        aria-label="Shopping cart"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-ground shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">Cart</h2>
            {cart && cart.totalQuantity > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                {cart.totalQuantity}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a href="/cart/" className="text-sm text-ink-soft hover:text-ink">View full cart</a>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close cart"
              className="flex h-11 w-11 items-center justify-center rounded hover:bg-ground-panel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-soft" aria-hidden="true">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p className="text-ink-muted">Your cart is empty.</p>
              <a href="/targets/" className="text-sm font-semibold text-brand hover:text-brand-dark">
                Browse targets →
              </a>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {lines.map((line) => (
                <CartLine
                  key={line.id}
                  line={line}
                  busy={busy === line.id}
                  onUpdateQty={(qty) => handleUpdateQty(line.id, qty)}
                  onRemove={() => handleRemove(line.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && cart && (
          <div className="border-t border-line px-5 py-4">
            <div className="flex items-center justify-between pb-2">
              <span className="font-semibold">Subtotal</span>
              <span className="spec text-lg font-bold" data-testid="cart-subtotal">
                {formatPrice(cart.cost.subtotalAmount.amount, cart.cost.subtotalAmount.currencyCode)}
              </span>
            </div>
            <p className="pb-4 text-xs text-ink-soft">VAT and shipping calculated at checkout</p>
            <div className="flex flex-col gap-2">
              <a
                href={cart.checkoutUrl}
                className="flex h-12 items-center justify-center rounded bg-brand text-base font-semibold text-white hover:bg-brand-dark"
              >
                Checkout
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-12 items-center justify-center rounded border border-line text-base font-medium text-ink hover:bg-ground-panel"
              >
                Continue shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function CartLine({
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
    <li className="flex gap-4 py-4" data-testid="cart-line">
      {/* Thumbnail */}
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

      {/* Details */}
      <div className="flex flex-1 flex-col gap-1">
        <a href={`/targets/${merchandise.product.handle}/`} className="text-sm font-semibold text-ink no-underline hover:text-brand">
          {merchandise.product.title}
        </a>
        <span className="text-xs text-ink-muted">{merchandise.title}</span>
        {merchandise.sku && (
          <span className="spec text-xs text-ink-soft">{merchandise.sku}</span>
        )}
        <span className="spec text-sm text-ink-muted">{unitPrice} each</span>

        <div className="mt-1.5 flex items-center gap-3">
          {/* Quantity stepper */}
          <div className="flex items-center rounded border border-line">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={busy}
              onClick={() => onUpdateQty(line.quantity - 1)}
              className="flex h-[44px] w-[44px] items-center justify-center text-lg font-semibold text-ink-muted hover:text-ink disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center text-sm" data-testid="line-quantity">{line.quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={busy}
              onClick={() => onUpdateQty(line.quantity + 1)}
              className="flex h-[44px] w-[44px] items-center justify-center text-lg font-semibold text-ink-muted hover:text-ink disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="text-xs text-ink-soft hover:text-brand disabled:opacity-40"
          >
            Remove
          </button>

          <span className="spec ml-auto text-sm font-semibold">{lineTotal}</span>
        </div>
      </div>
    </li>
  );
}
