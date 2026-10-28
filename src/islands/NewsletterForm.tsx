import { useState, useRef } from 'react';

/**
 * Newsletter signup form.
 * Posts to /api/subscribe (Cloudflare Pages Function → Shopify Admin API).
 * Honeypot field to reduce spam.
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'busy' | 'success' | 'error'>('idle');
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
        body: JSON.stringify({ email: trimmed, honeypot: honeypotRef.current?.value ?? '' }),
      });
      const data = await res.json();

      if (data.ok) {
        setStatus('success');
        setMessage(
          data.state === 'PENDING'
            ? 'Check your inbox to confirm your subscription.'
            : 'Subscribed! You\'ll hear from us monthly.',
        );
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

  return (
    <form className="card flex flex-col gap-4 self-start bg-ground-alt p-8" onSubmit={handleSubmit}>
      <strong className="text-xl">New tools and targets, monthly.</strong>
      <span className="text-[15px] text-ink-muted">No marketing fluff. One email a month, unsubscribe anytime.</span>

      <label htmlFor="nl-email" className="text-[13px] font-semibold">Work email</label>
      <div className="flex gap-2">
        <input
          id="nl-email"
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded border border-line bg-ground px-3 py-3 text-[15px] text-ink"
        />
        <button
          type="submit"
          disabled={status === 'busy'}
          className="btn-md btn-primary disabled:opacity-50"
        >
          {status === 'busy' ? 'Sending…' : 'Subscribe'}
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

      {message && (
        <p className={`m-0 text-sm ${status === 'success' ? 'text-green-700' : 'text-brand'}`}>
          {message}
        </p>
      )}
    </form>
  );
}
