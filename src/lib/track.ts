/**
 * Site events for Google Analytics. Goes through gtag only, so nothing is sent unless the visitor's
 * choice allows analytics and a tag is configured (src/lib/consent.ts, src/lib/tags.ts).
 * Events say that something happened, not what was typed: no names, email addresses or messages.
 */
export type TrackEvent = 'generate_lead' | 'add_to_cart' | 'file_download' | 'save_pattern' | 'plumbline_download';

type Value = string | number | boolean;

/** Short plain values only; anything that looks like an email address or free text is dropped. */
export function cleanParams(params: Record<string, Value | undefined>): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && v.length <= 100 && !v.includes('@')) out[k] = v;
  }
  return out;
}

export function track(event: TrackEvent, params: Record<string, Value | undefined> = {}): void {
  try {
    const gtag = typeof window === 'undefined' ? undefined : (window as Window & { gtag?: (...a: unknown[]) => void }).gtag;
    if (gtag) gtag('event', event, cleanParams(params));
  } catch {
    // analytics must never break the page
  }
}
