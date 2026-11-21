import { ACCOUNT_LINE } from '@/lib/brand';
import { patternViewPath } from '@/lib/patternLink';
import { useEffect, useState, type ReactNode } from 'react';
import type { AccountSummary } from '@/lib/accountApi';
import type { SavedPattern } from '@/lib/account';
import { newTabHint } from '../../scripts/new-tab-hint.mjs';

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
  token: 'Sign-in did not complete. Please try again.',
  idtoken: 'Sign-in did not complete. Please try again.',
  nonce: 'Sign-in did not complete. Please try again.',
};

/** Signed-out view: what an account gives, one line each. */
const BENEFITS: [string, string][] = [
  ['Saved patterns', 'Reopen any generator pattern on any computer.'],
  ['Quotes', 'Every quote and its status in one place.'],
  ['Orders', 'Follow payment and shipping.'],
  ['No password', 'Sign in with Google, or with a one-time code sent to your email.'],
];

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

/** One account section: a card with its title, count and one action on the top row, then a table or a one-line empty state. */
function Section({ id, title, count, action, children }: { id: string; title: string; count: number; action: { href: string; label: string }; children: ReactNode }) {
  return (
    <section className="card" aria-labelledby={id}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4">
        <h2 id={id} className="m-0 flex items-baseline gap-2 text-[18px] font-semibold">
          {title}
          <span className="font-mono text-[13px] font-normal text-ink-muted">{count}</span>
        </h2>
        <a className="text-[14px] underline underline-offset-[3px]" href={action.href}>{action.label}</a>
      </div>
      {children}
    </section>
  );
}

const LINK_BTN = 'text-[14px] underline underline-offset-[3px] disabled:opacity-50';
const EMPTY = 'm-0 border-t border-line px-5 py-4 text-[15px] text-ink-muted';

const TH = 'h-10 px-5 whitespace-nowrap text-left font-mono text-[12px] font-medium uppercase tracking-[0.04em] text-brand-dark bg-brand-tint';
const TD = 'h-10 px-5 whitespace-nowrap text-[14px] border-t border-line';

export default function AccountPanel() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  /** The row being renamed and the text in its field. */
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const qs = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const error = qs.get('error') ?? '';
  const detail = /^[a-z0-9_]{1,60}$/.test(qs.get('detail') ?? '') ? qs.get('detail') : '';
  const ref = ERRORS[error] && error !== 'unavailable' && error !== 'cancelled' ? [error, detail].filter(Boolean).join('/') : '';

  useEffect(() => {
    fetch('/api/account/summary', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (r) => {
        if (r.status === 401 || r.status === 503) {
          const b = await r.json().catch(() => ({}));
          setState({ kind: 'signedOut', available: b.available !== false });
        } else if (r.ok) {
          setState({ kind: 'ready', data: await r.json() });
          // Signed in: a leftover ?error=… from an earlier attempt no longer applies.
          if (window.location.search) window.history.replaceState(null, '', window.location.pathname + window.location.hash);
        } else {
          setState({ kind: 'error' });
        }
      })
      .catch(() => setState({ kind: 'error' }));
  }, []);

  /** One call for both changes to the saved list; the server returns the new list. */
  async function change(p: SavedPattern, body: Record<string, string>, done: string, failed: string) {
    if (state.kind !== 'ready') return;
    setBusy(p.id);
    setNotice('');
    try {
      const r = await fetch('/api/account/patterns', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, id: p.id }),
      });
      if (!r.ok) throw new Error();
      const { patterns } = await r.json();
      setState({ kind: 'ready', data: { ...state.data, patterns } });
      setNotice(done);
      setEditing(null);
    } catch {
      setNotice(failed);
    } finally {
      setBusy('');
    }
  }
  const remove = (p: SavedPattern) => change(p, { action: 'remove' }, `Removed ${p.name}.`, 'Could not remove the pattern. Please try again.');
  const rename = (p: SavedPattern, name: string) =>
    name.trim() && name.trim() !== p.name
      ? change(p, { action: 'rename', name }, 'Name saved.', 'Could not save the name. Please try again.')
      : setEditing(null);

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
      <div className="grid items-start gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]" data-rows="layout">
      <div className="order-2 flex flex-col gap-6 lg:order-1">
        {msg && (
          <p className="m-0 border border-line-strong bg-sheet p-3 text-[14px]" role="alert">
            {msg}
            {ref && <span className="block font-mono text-[12px] text-ink-muted">Reference: {ref}</span>}
          </p>
        )}
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {BENEFITS.map(([title, text]) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 bg-brand" aria-hidden="true" />
              <span className="text-base"><strong className="font-semibold">{title}</strong> <span className="text-ink-muted">{text}</span></span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-md btn-primary no-underline" href="/api/account/login?return=/account/">Create account</a>
          <a className="btn btn-md btn-secondary no-underline" href="/api/account/login?return=/account/">Sign in</a>
        </div>
        <p className="m-0 text-[13px] text-ink-muted">
          Next page: continue with Google or enter your email. No Shop app needed. One cookie keeps you signed in, no tracking. <a href="/privacy/">Privacy policy</a>
        </p>
      </div>
      <div className="card bracket order-1 flex flex-col gap-5 p-6 [--bracket:14px] lg:order-2 lg:gap-7 lg:px-10 lg:py-11">
        <span className="block h-3 w-3 bg-brand" aria-hidden="true" />
        <p className="m-0 max-w-[14em] text-[22px] font-semibold leading-[1.25] tracking-[-0.01em] text-ink lg:text-[28px]">{ACCOUNT_LINE}</p>
        <span className="spec-label">Calib.Tools</span>
      </div>
      </div>
    );
  }

  const d = state.data;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <p className="m-0 flex flex-col gap-1">
          <span className="eyebrow">Signed in as</span>
          <span className="break-all font-mono text-[15px]">{d.email}</span>
        </p>
        <a className="btn btn-md btn-secondary no-underline" href="/api/account/logout">Sign out</a>
      </div>

      <Section id="acct-patterns" title="Saved patterns" count={d.patterns.length} action={{ href: '/tools/generator/', label: 'Open the generator' }}>
        {notice && <p className="m-0 border-t border-line px-5 py-3 text-[14px]" role="status">{notice}</p>}
        {d.patterns.length === 0 ? (
          <p className={EMPTY}>Nothing saved yet. In the generator, “Save to account” keeps a pattern here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className={TH}>Name</th><th className={TH}>Pattern ID</th><th className={TH}>Saved</th><th className={TH}><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {d.patterns.map((p) => (
                  <tr key={p.id}>
                    <td className={TD}>
                      {editing?.id === p.id ? (
                        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); rename(p, editing.name); }}>
                          <label className="sr-only" htmlFor={`name-${p.id}`}>Name for {p.id}</label>
                          <input
                            id={`name-${p.id}`}
                            className="h-8 w-[280px] max-w-full border border-line-strong bg-sheet px-2 text-[14px]"
                            value={editing.name}
                            maxLength={80}
                            autoFocus
                            onChange={(e) => setEditing({ id: p.id, name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }}
                          />
                          <button type="submit" className={LINK_BTN} disabled={busy === p.id}>Save</button>
                          <button type="button" className={`${LINK_BTN} text-ink-muted`} onClick={() => setEditing(null)}>Cancel</button>
                        </form>
                      ) : (
                        <a href={patternViewPath(p.path)}>{p.name}</a>
                      )}
                    </td>
                    <td className={`${TD} font-mono`}>{p.id}</td>
                    <td className={`${TD} font-mono`}>{date(p.savedAt)}</td>
                    <td className={`${TD} text-right`}>
                      <a className="mr-4" href={`/quote/?pattern=${encodeURIComponent(p.path)}`}>Request a quote</a>
                      <button type="button" className={`${LINK_BTN} mr-4 text-ink-muted`} disabled={busy === p.id} onClick={() => setEditing({ id: p.id, name: p.name })}>Rename</button>
                      <button type="button" className={`${LINK_BTN} text-ink-muted`} disabled={busy === p.id} onClick={() => remove(p)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="acct-quotes" title="Quotes" count={d.quotes.length} action={{ href: '/quote/', label: 'Request a quote' }}>
        {d.quotes.length === 0 ? (
          <p className={EMPTY}>No quotes yet. Custom sizes and materials are made to order.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className={TH}>Quote</th><th className={TH}>Date</th><th className={TH}>Status</th><th className={`${TH} text-right`}>Total</th><th className={TH}>Documents</th><th className={TH}><span className="sr-only">Link</span></th></tr></thead>
              <tbody>
                {d.quotes.map((q) => (
                  <tr key={q.name}>
                    <td className={`${TD} font-mono`}>{q.no || q.name}</td>
                    <td className={`${TD} font-mono`}>{date(q.date)}</td>
                    <td className={TD}>{QUOTE_STATUS[q.status]}</td>
                    <td className={`${TD} font-mono text-right`}>{money(q.total)}</td>
                    <td className={TD}><Docs d={q} /></td>
                    <td className={`${TD} text-right whitespace-nowrap`}>{q.url ? <a href={q.url}>View and order</a> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="acct-orders" title="Orders" count={d.orders.length} action={{ href: '/targets/', label: 'Shop targets' }}>
        {d.orders.length === 0 ? (
          <p className={EMPTY}>No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className={TH}>Order</th><th className={TH}>Date</th><th className={TH}>Payment</th><th className={TH}>Shipping</th><th className={`${TH} text-right`}>Total</th><th className={TH}>Documents</th><th className={TH}><span className="sr-only">Link</span></th></tr></thead>
              <tbody>
                {d.orders.map((o) => (
                  <tr key={o.name}>
                    <td className={`${TD} font-mono`}>{o.name}{o.no && <span className="block text-[13px] text-ink-muted">Quote {o.no}</span>}</td>
                    <td className={`${TD} font-mono`}>{date(o.date)}</td>
                    <td className={`${TD} first-letter:uppercase`}>{o.payment}</td>
                    <td className={`${TD} first-letter:uppercase`}>{o.fulfillment}</td>
                    <td className={`${TD} font-mono text-right`}>{money(o.total)}</td>
                    <td className={TD}><Docs d={o} /></td>
                    <td className={`${TD} text-right whitespace-nowrap`}><a href={o.page || o.url}>Order details</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

/** Quotation PDF and the pattern behind a quote or order, when Calib.Tools attached them. */
function Docs({ d }: { d: { pdf: string; pattern: string; patternId: string } }) {
  if (!d.pdf && !d.pattern) return <span className="text-ink-muted">—</span>;
  return (
    <span className="flex flex-col gap-1 whitespace-nowrap">
      {d.pdf && <a href={d.pdf} target="_blank" rel="noopener">Quotation (PDF)<span className="sr-only">{newTabHint()}</span></a>}
      {d.pattern && <a href={patternViewPath(d.pattern)}>Pattern <span className="font-mono">{d.patternId}</span></a>}
    </span>
  );
}
