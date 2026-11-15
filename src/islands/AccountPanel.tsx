import { useEffect, useState } from 'react';
import type { AccountSummary } from '@/lib/accountApi';
import type { SavedPattern } from '@/lib/account';

type State =
  | { kind: 'loading' }
  | { kind: 'signedOut'; available: boolean }
  | { kind: 'error' }
  | { kind: 'ready'; data: AccountSummary };

const ERRORS: Record<string, string> = {
  unavailable: 'Sign-in is not switched on yet. Please try again later or write to hello@calib.tools.',
  cancelled: 'Sign-in was cancelled.',
  expired: 'The sign-in link expired. Please sign in again.',
  signin: 'Sign-in did not complete. Please try again.',
};

const QUOTE_STATUS: Record<AccountSummary['quotes'][number]['status'], string> = {
  open: 'In preparation',
  sent: 'Ready to order',
  completed: 'Ordered',
};

function date(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function money(m: { amount: string; currencyCode: string }): string {
  const n = Number(m.amount);
  if (!Number.isFinite(n)) return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currencyCode }).format(n);
  } catch {
    return `${n.toFixed(2)} ${m.currencyCode}`;
  }
}

function SectionHead({ label, title, count }: { label: string; title: string; count: number }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">{label}</span>
      <span className="section-rule" aria-hidden="true" />
      <h2 className="m-0 text-[22px] font-semibold">
        {title} <span className="font-mono text-[14px] font-normal text-ink-muted">({count})</span>
      </h2>
    </div>
  );
}

const TH = 'h-10 px-3 text-left font-mono text-[12px] font-medium uppercase tracking-[0.04em] text-brand-dark bg-brand-tint';
const TD = 'h-10 px-3 text-[14px] border-t border-line';

export default function AccountPanel() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const error = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('error') ?? '';

  useEffect(() => {
    fetch('/api/account/summary', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (r) => {
        if (r.status === 401 || r.status === 503) {
          const b = await r.json().catch(() => ({}));
          setState({ kind: 'signedOut', available: b.available !== false });
        } else if (r.ok) {
          setState({ kind: 'ready', data: await r.json() });
        } else {
          setState({ kind: 'error' });
        }
      })
      .catch(() => setState({ kind: 'error' }));
  }, []);

  async function remove(p: SavedPattern) {
    if (state.kind !== 'ready') return;
    setBusy(p.id);
    setNotice('');
    try {
      const r = await fetch('/api/account/patterns', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id: p.id }),
      });
      if (!r.ok) throw new Error();
      const { patterns } = await r.json();
      setState({ kind: 'ready', data: { ...state.data, patterns } });
      setNotice(`Removed ${p.name}.`);
    } catch {
      setNotice('Could not remove the pattern. Please try again.');
    } finally {
      setBusy('');
    }
  }

  if (state.kind === 'loading') {
    return <p className="m-0 text-ink-muted" role="status">Loading your account…</p>;
  }

  if (state.kind === 'error') {
    return (
      <p className="m-0 text-ink-muted" role="alert">
        Your account could not be loaded. Please reload the page, or write to <a href="mailto:support@calib.tools">support@calib.tools</a>.
      </p>
    );
  }

  if (state.kind === 'signedOut') {
    const msg = ERRORS[error] ?? (state.available ? '' : ERRORS.unavailable);
    return (
      <div className="flex max-w-[560px] flex-col gap-4">
        {msg && <p className="m-0 border border-line-strong bg-sheet p-3 text-[14px]" role="alert">{msg}</p>}
        <p className="m-0 text-base text-ink-muted">
          Keep generator patterns, see your quotes and follow your orders. Both buttons open the same Shopify page: enter your
          email and a one-time code. A new email gets a new account; no password and no Shop app needed.
        </p>
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-md btn-primary no-underline" href="/api/account/login?return=/account/">Create account</a>
          <a className="btn btn-md btn-secondary no-underline" href="/api/account/login?return=/account/">Sign in</a>
        </div>
        <p className="m-0 text-[13px] text-ink-muted">
          On the sign-in page, use the email field. The “Continue with Shop” button is only a shortcut for people who already use Shop.
        </p>
        <p className="m-0 text-[13px] text-ink-muted">
          Signing in sets a cookie on calib.tools that keeps you signed in; nothing is used for tracking. See the <a href="/privacy/">privacy policy</a>.
        </p>
      </div>
    );
  }

  const d = state.data;
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="m-0 text-base">
          Signed in as <span className="font-mono">{d.email}</span>
        </p>
        <a className="btn btn-md btn-secondary no-underline" href="/api/account/logout">Sign out</a>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="acct-patterns">
        <div id="acct-patterns"><SectionHead label="Generator" title="Saved patterns" count={d.patterns.length} /></div>
        {notice && <p className="m-0 text-[14px]" role="status">{notice}</p>}
        {d.patterns.length === 0 ? (
          <p className="m-0 text-ink-muted">
            No saved patterns yet. In the <a href="/tools/generator/">pattern generator</a>, use “Save to account” to keep a pattern here.
          </p>
        ) : (
          <div className="overflow-x-auto border border-line bg-sheet">
            <table className="w-full border-collapse">
              <thead><tr><th className={TH}>Name</th><th className={TH}>Pattern ID</th><th className={TH}>Saved</th><th className={TH}><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {d.patterns.map((p) => (
                  <tr key={p.id}>
                    <td className={TD}><a href={p.path}>{p.name}</a></td>
                    <td className={`${TD} font-mono`}>{p.id}</td>
                    <td className={`${TD} font-mono`}>{date(p.savedAt)}</td>
                    <td className={`${TD} text-right whitespace-nowrap`}>
                      <a className="mr-4" href={`/quote/?pattern=${encodeURIComponent(p.path)}`}>Request a quote</a>
                      <button type="button" className="text-[14px] text-ink-muted underline underline-offset-[3px] disabled:opacity-50" disabled={busy === p.id} onClick={() => remove(p)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="acct-quotes">
        <div id="acct-quotes"><SectionHead label="Custom orders" title="Quotes" count={d.quotes.length} /></div>
        {d.quotes.length === 0 ? (
          <p className="m-0 text-ink-muted">No quotes yet. <a href="/quote/">Request a quote</a> for a custom size or material.</p>
        ) : (
          <div className="overflow-x-auto border border-line bg-sheet">
            <table className="w-full border-collapse">
              <thead><tr><th className={TH}>Quote</th><th className={TH}>Date</th><th className={TH}>Status</th><th className={`${TH} text-right`}>Total</th><th className={TH}><span className="sr-only">Link</span></th></tr></thead>
              <tbody>
                {d.quotes.map((q) => (
                  <tr key={q.name}>
                    <td className={`${TD} font-mono`}>{q.name}</td>
                    <td className={`${TD} font-mono`}>{date(q.date)}</td>
                    <td className={TD}>{QUOTE_STATUS[q.status]}</td>
                    <td className={`${TD} font-mono text-right`}>{money(q.total)}</td>
                    <td className={`${TD} text-right whitespace-nowrap`}>{q.url ? <a href={q.url}>View and order</a> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="acct-orders">
        <div id="acct-orders"><SectionHead label="Shop" title="Orders" count={d.orders.length} /></div>
        {d.orders.length === 0 ? (
          <p className="m-0 text-ink-muted">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto border border-line bg-sheet">
            <table className="w-full border-collapse">
              <thead><tr><th className={TH}>Order</th><th className={TH}>Date</th><th className={TH}>Payment</th><th className={TH}>Shipping</th><th className={`${TH} text-right`}>Total</th><th className={TH}><span className="sr-only">Link</span></th></tr></thead>
              <tbody>
                {d.orders.map((o) => (
                  <tr key={o.name}>
                    <td className={`${TD} font-mono`}>{o.name}</td>
                    <td className={`${TD} font-mono`}>{date(o.date)}</td>
                    <td className={`${TD} first-letter:uppercase`}>{o.payment}</td>
                    <td className={`${TD} first-letter:uppercase`}>{o.fulfillment}</td>
                    <td className={`${TD} font-mono text-right`}>{money(o.total)}</td>
                    <td className={`${TD} text-right whitespace-nowrap`}><a href={o.url}>Order status</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
