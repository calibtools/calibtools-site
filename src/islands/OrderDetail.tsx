import { useEffect, useState } from 'react';
import { patternViewPath } from '@/lib/patternLink';
import { SIGN_OFF_LINE } from '@/lib/brand';
import { CONTACT_EMAIL, CUSTOM_ORDER_FINAL } from '@/lib/claims';
import type { OrderDetail as Order, Money } from '@/lib/accountOrder';

type State =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'notFound' }
  | { kind: 'error' }
  | { kind: 'ready'; order: Order };

function day(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function money(m: Money | null): string {
  if (!m) return '';
  const n = Number(m.amount);
  if (!Number.isFinite(n)) return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currencyCode }).format(n);
  } catch {
    return `${n.toFixed(2)} ${m.currencyCode}`;
  }
}

const LABEL = 'font-mono text-[12px] font-medium uppercase tracking-[0.04em]';
const HEAD = `${LABEL} m-0 bg-brand-tint px-5 py-3 text-brand-dark`;
const TH = `h-10 px-3 first:pl-5 last:pr-5 md:px-5 whitespace-nowrap text-left ${LABEL} text-ink-muted border-t border-line`;
const TD = 'px-3 py-3 text-[14px] border-t border-line align-top first:pl-5 last:pr-5 md:px-5';

/** Four squares joined by a rule: filled green when the step is done, outlined when it is still to come. */
function Steps({ order }: { order: Order }) {
  return (
    <ol className="m-0 grid list-none grid-cols-4 p-0" aria-label="Order progress">
      {order.steps.map((s, i) => (
        <li key={s.label} className="relative flex flex-col gap-2 pr-2">
          {i > 0 && <span className={`absolute left-[-100%] top-[5px] ml-3 h-px w-[calc(100%-12px)] ${s.done ? 'bg-ok' : 'bg-line-strong'}`} aria-hidden="true" />}
          <span className={`relative h-3 w-3 border ${s.done ? 'border-ok bg-ok' : 'border-line-strong bg-sheet'}`} aria-hidden="true" />
          <span className={`text-[14px] font-semibold ${s.done ? 'text-ink' : 'text-ink-soft'}`}>{s.label}<span className="sr-only">{s.done ? ' (done)' : ' (not yet)'}</span></span>
          <span className="min-h-[18px] whitespace-nowrap font-mono text-[11px] text-ink-muted md:text-[12px]">{s.done ? day(s.date) : ''}</span>
        </li>
      ))}
    </ol>
  );
}

function Address({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section className="card rows-2 gap-y-0">
      <h2 className={HEAD}>{title}</h2>
      <p className="m-0 px-5 py-4 text-[14px] leading-[22px]">
        {lines.length ? lines.map((l, i) => <span key={i} className="block">{l}</span>) : <span className="text-ink-muted">Not given</span>}
      </p>
    </section>
  );
}

export function OrderView({ order }: { order: Order }) {
  const hasDocs = Boolean(order.pdf || order.pattern);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <a className="text-[14px] underline underline-offset-[3px]" href="/account/">Back to your account</a>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="h-display m-0 text-[32px] md:text-[40px]">Order <span className="font-mono">{order.name}</span></h1>
          <p className="m-0 font-mono text-[13px] text-ink-muted">
            Placed {day(order.date)}{order.no && <> · Quote {order.no}</>}{order.poNumber && <> · PO {order.poNumber}</>}
          </p>
        </div>
      </header>

      <section className="card px-5 py-5" aria-label="Status">
        {order.cancelled
          ? <p className="m-0 text-[15px] font-semibold text-brand-text">This order was canceled.</p>
          : <Steps order={order} />}
        {order.refunded && <p className="m-0 mt-4 border-t border-line pt-4 text-[14px] text-ink-muted">Refunded: <span className="font-mono text-ink">{money(order.refunded)}</span></p>}
      </section>

      <section className="card" aria-labelledby="order-items">
        <h2 id="order-items" className={HEAD}>Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH} scope="col">Item</th>
                <th className={`${TH} text-right`} scope="col">Qty</th>
                <th className={`${TH} text-right`} scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((l, i) => (
                <tr key={i}>
                  <td className={TD}>
                    <span className="flex items-start gap-3 md:gap-4">
                      {l.image
                        ? <img src={l.image} alt={l.alt} width="56" height="56" loading="lazy" className="h-10 w-10 shrink-0 border border-line bg-sheet object-contain md:h-14 md:w-14" />
                        : <span className="h-10 w-10 shrink-0 border border-line bg-ground-alt md:h-14 md:w-14" aria-hidden="true" />}
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-semibold text-ink">{l.title}</span>
                        {l.variant && <span className="text-ink-muted">{l.variant}</span>}
                        {l.attributes.map((a) => (
                          <span key={a.key} className="flex flex-wrap gap-x-1 text-[13px] text-ink-muted"><span className="whitespace-nowrap">{a.key}:</span><span className="whitespace-nowrap font-mono text-ink">{a.value}</span></span>
                        ))}
                        {l.sku && <span className="font-mono text-[12px] text-ink-soft">{l.sku}</span>}
                      </span>
                    </span>
                  </td>
                  <td className={`${TD} text-right font-mono`}>{l.quantity}</td>
                  <td className={`${TD} text-right font-mono whitespace-nowrap`}>{money(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-y-2 border-t border-line px-5 py-4 text-[14px] [&>dd]:pl-8">
          {order.subtotal && <><dt className="text-ink-muted">Subtotal</dt><dd className="m-0 text-right font-mono">{money(order.subtotal)}</dd></>}
          <dt className="text-ink-muted">Shipping</dt><dd className="m-0 text-right font-mono">{money(order.shipping)}</dd>
          {order.tax && Number(order.tax.amount) > 0 && <><dt className="text-ink-muted">Taxes</dt><dd className="m-0 text-right font-mono">{money(order.tax)}</dd></>}
          <dt className="border-t border-ink pt-3 font-semibold">Total</dt>
          <dd className="m-0 border-t border-ink pt-3 text-right font-mono text-[16px] font-semibold">{money(order.total)}</dd>
        </dl>
      </section>

      <section className="card" aria-labelledby="order-shipping">
        <h2 id="order-shipping" className={HEAD}>Shipping</h2>
        {order.shipments.length === 0 ? (
          <p className="m-0 px-5 py-4 text-[15px] text-ink-muted">Not shipped yet. Targets are made to order; you get an email with the tracking number when yours leaves.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {order.shipments.map((s, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-line px-5 py-4 text-[14px] first:border-t-0">
                <span className="flex flex-col gap-1">
                  <span className="font-semibold capitalize text-ok">{s.status}</span>
                  <span className="font-mono text-[12px] text-ink-muted">Shipped {day(s.date)}{s.eta && <> · expected {day(s.eta)}</>}</span>
                </span>
                <span className="flex flex-col gap-1 text-right">
                  {s.tracking.map((t) => (
                    <span key={t.number}>
                      {t.company && <span className="text-ink-muted">{t.company} </span>}
                      {t.url ? <a className="font-mono" href={t.url} target="_blank" rel="noopener">{t.number}</a> : <span className="font-mono">{t.number}</span>}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Address title="Ship to" lines={order.shipTo} />
        <Address title="Bill to" lines={order.billTo.length ? order.billTo : order.shipTo} />
      </div>

      {hasDocs && (
        <section className="card" aria-labelledby="order-docs">
          <h2 id="order-docs" className={HEAD}>Documents</h2>
          <ul className="m-0 flex list-none flex-col p-0 text-[14px]">
            {order.pdf && <li className="border-t border-line px-5 py-3 first:border-t-0"><a href={order.pdf} target="_blank" rel="noopener">Quotation {order.no} (PDF)</a></li>}
            {order.pattern && <li className="border-t border-line px-5 py-3 first:border-t-0"><a href={patternViewPath(order.pattern)}>Pattern <span className="font-mono">{order.patternId}</span></a> <span className="text-ink-muted">with every parameter, as ordered</span></li>}
          </ul>
        </section>
      )}

      {order.no && (
        <p className="m-0 border border-line bg-ground-alt px-5 py-4 text-[14px] leading-[22px] text-ink-muted">
          <span className="font-semibold text-ink">Made to order.</span> {CUSTOM_ORDER_FINAL}
        </p>
      )}

      <footer className="flex flex-col gap-2 border-t border-line pt-5">
        <p className="m-0 flex items-start gap-3 text-[15px] font-semibold leading-[22px]"><span className="mt-[7px] inline-block h-2 w-2 shrink-0 bg-brand" aria-hidden="true" />{SIGN_OFF_LINE}</p>
        <p className="m-0 text-[14px] text-ink-muted">Questions about this order? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and mention <span className="font-mono">{order.name}</span>.</p>
      </footer>
    </div>
  );
}

export default function OrderDetail() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id') ?? '';
    if (!/^\d{1,20}$/.test(id)) { setState({ kind: 'notFound' }); return; }
    fetch(`/api/account/order?id=${id}`, { credentials: 'same-origin' })
      .then(async (r) => {
        if (r.status === 401) return setState({ kind: 'signedOut' });
        if (r.status === 404) return setState({ kind: 'notFound' });
        if (!r.ok) return setState({ kind: 'error' });
        setState({ kind: 'ready', order: (await r.json()) as Order });
      })
      .catch(() => setState({ kind: 'error' }));
  }, []);

  if (state.kind === 'ready') return <OrderView order={state.order} />;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="h-display m-0 text-[32px] md:text-[40px]">Your order</h1>
      {state.kind === 'loading' && <p className="m-0 text-[15px] text-ink-muted" role="status">Loading your order…</p>}
      {state.kind === 'signedOut' && (
        <div className="card flex flex-col items-start gap-4 px-5 py-5">
          <p className="m-0 text-[15px]">Sign in to see this order.</p>
          <a className="btn-md btn-primary" href={`/api/account/login?return=${encodeURIComponent(window.location.pathname + window.location.search)}`}>Sign in</a>
        </div>
      )}
      {state.kind === 'notFound' && <p className="m-0 text-[15px]">We could not find this order in your account. <a href="/account/">Back to your account</a></p>}
      {state.kind === 'error' && <p className="m-0 text-[15px]" role="alert">The order could not be loaded just now. Please try again in a minute, or go <a href="/account/">back to your account</a>.</p>}
    </div>
  );
}
