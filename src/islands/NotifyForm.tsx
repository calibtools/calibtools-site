import { useState, useRef } from 'react';

interface Props {
  handle: string;
}

export default function NotifyForm({ handle }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'busy' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypotRef.current?.value) return;

    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('busy');
    setMessage('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          honeypot: honeypotRef.current?.value ?? '',
          tag: `revision:${handle}`,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setStatus('success');
        setMessage('You\u2019ll be notified when the datasheet is updated.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <p className="m-0 text-sm text-green-700">{message}</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold">Notify me when this datasheet is revised</span>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="input flex-1 text-sm"
          disabled={status === 'busy'}
        />
        {/* Honeypot */}
        <input
          ref={honeypotRef}
          type="text"
          name="company_url"
          autoComplete="off"
          tabIndex={-1}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          aria-hidden="true"
        />
        <button
          type="submit"
          disabled={status === 'busy'}
          className="btn-md btn-primary shrink-0"
        >
          {status === 'busy' ? 'Subscribing…' : 'Notify me'}
        </button>
      </div>
      {status === 'error' && message && (
        <p className="m-0 text-sm text-brand">{message}</p>
      )}
    </form>
  );
}
