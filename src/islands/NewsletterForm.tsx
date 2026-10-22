import { useState, useRef } from 'react';
import { customerCreate } from '@/lib/shopify';

/**
 * Newsletter signup form.
 * Uses Shopify Storefront customerCreate with acceptsMarketing: true.
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

    if (!email.trim()) return;

    setStatus('busy');
    setMessage('');

    const result = await customerCreate(email.trim());
    setStatus(result.success ? 'success' : 'error');
    setMessage(result.message);
    if (result.success) setEmail('');
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
          className="flex-1 rounded border border-[#CFCFCF] bg-white px-3 py-3 text-[15px]"
        />
        <button
          type="submit"
          disabled={status === 'busy'}
          className="rounded bg-brand px-[18px] py-3 text-[15px] font-semibold text-white disabled:opacity-50"
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
