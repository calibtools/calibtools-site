/**
 * Browser side of Cloudflare Turnstile (human check), explicit rendering so the
 * same loader works in Astro pages and React islands. Without a site key
 * (PUBLIC_TURNSTILE_SITE_KEY at build time) nothing is loaded.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

export const TURNSTILE_SITE_KEY: string = (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined) ?? '';

let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('turnstile load failed'));
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Render the check into `el`; `onToken` gets the token ('' when it expires). Returns a reset function. */
export async function mountTurnstile(el: HTMLElement, onToken: (token: string) => void): Promise<() => void> {
  if (!TURNSTILE_SITE_KEY) return () => {};
  await load();
  const id = window.turnstile!.render(el, {
    sitekey: TURNSTILE_SITE_KEY,
    size: 'flexible',
    theme: 'light',
    callback: (t: string) => onToken(t),
    'expired-callback': () => onToken(''),
    'error-callback': () => onToken(''),
  });
  return () => { window.turnstile?.reset(id); onToken(''); };
}
