import { useState, useRef } from 'react';
import TurnstileBox from './TurnstileBox';
import { track } from '@/lib/track';

interface Props {
  /** Heading, note and button text; default to the monthly newsletter wording. */
  heading?: string;
  note?: string;
  button?: string;
  /** Message after a successful signup. */
  done?: string;
  /** Tag set on the subscriber in Shopify, e.g. "notify:plumbline". Also names the GA4 event's form. */
  tag?: string;
  /** One line: email field and button side by side, no card, human check hidden unless needed. */
  compact?: boolean;
  /** Prefix for the input id when two forms share a page. */
  id?: string;
}

/**
 * Newsletter signup form.
 * Posts to /api/subscribe (Cloudflare Pages Function → Shopify Admin API).
 * Honeypot field to reduce spam.
 */
export default function NewsletterForm({ heading = 'New tools and targets, monthly.', note = 'No marketing fluff. One email a month, unsubscribe anytime.', button = 'Subscribe', done, tag, compact = false, id = 'nl' }: Props = {}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'busy' | 'success' | 'error'>('idle');
  const [turnstile, setTurnstile] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [message, setMessage] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Honeypot check
    if (honeypotRef.current?.value) return;

    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('busy');
    setMessage('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, honeypot: honeypotRef.current?.value ?? '', turnstile, ...(tag ? { tag } : {}) }),
      });
      const data = await res.json();
      setResetKey((k) => k + 1);

      if (data.ok) {
        setStatus('success');
        setMessage(
          data.state === 'PENDING'
            ? 'Check your inbox to confirm your subscription.'
            : done ?? 'Subscribed! You\'ll hear from us monthly.',
        );
        if (tag) track('generate_lead', { form: tag });
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  if (compact) {
    return (
      <form className="flex w-full max-w-[460px] flex-col gap-2" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <label htmlFor={`${id}-email`} className="sr-only">{heading}</label>
          <input
            id={`${id}-email`}
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded border border-line-strong bg-sheet px-3 text-[15px] text-ink"
          />
          <button type="submit" disabled={status === 'busy'} className="btn-md btn-primary shrink-0 disabled:opacity-50">
            {status === 'busy' ? 'Sending…' : button}
          </button>
        </div>
        <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true" />
        <TurnstileBox onToken={setTurnstile} resetKey={resetKey} quiet />
        <p className={`m-0 text-[13px] ${message ? (status === 'success' ? 'text-ok' : 'text-brand-dark') : 'text-ink-muted'}`} aria-live="polite">{message || note}</p>
      </form>
    );
  }

  return (
    <form className="card flex flex-col gap-4 self-start bg-ground-alt p-5 sm:p-8 max-w-full overflow-hidden" onSubmit={handleSubmit}>
      <strong className="text-xl">{heading}</strong>
      <span className="text-[15px] text-ink-muted">{note}</span>

      <label htmlFor={`${id}-email`} className="text-[13px] font-semibold">Work email</label>
      <div className="flex gap-2">
        <input
          id={`${id}-email`}
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded border border-line bg-ground px-3 py-3 text-[15px] text-ink"
        />
        <button
          type="submit"
          disabled={status === 'busy'}
          className="btn-md btn-primary disabled:opacity-50"
        >
          {status === 'busy' ? 'Sending…' : button}
        </button>
      </div>

      {/* Honeypot — hidden from real users */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        aria-hidden="true"
      />

      <TurnstileBox onToken={setTurnstile} resetKey={resetKey} />

      {message && (
        <p className={`m-0 text-sm ${status === 'success' ? 'text-green-700' : 'text-brand'}`}>
          {message}
        </p>
      )}
    </form>
  );
}
