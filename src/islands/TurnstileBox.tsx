import { useEffect, useRef } from 'react';
import { mountTurnstile, TURNSTILE_SITE_KEY } from '@/lib/turnstileClient';

/** Cloudflare human check for React forms. Renders nothing until a site key is configured. */
export default function TurnstileBox({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});
  useEffect(() => {
    if (!ref.current || !TURNSTILE_SITE_KEY) return;
    let alive = true;
    mountTurnstile(ref.current, (t) => alive && onToken(t)).then((r) => { reset.current = r; });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (resetKey) reset.current(); }, [resetKey]);
  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
