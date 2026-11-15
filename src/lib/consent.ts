/**
 * Cookie consent: the stored choice and what it allows.
 * Decided 2026-11-15 (replaces the 2026-11-08 rule that asked first outside the United States): analytics and
 * marketing tags are on by default for every visitor and can be switched off under "Options" or
 * "Privacy settings". A Global Privacy Control signal always counts as "no". The region only decides
 * whether the "Do not sell or share" link is shown (United States). Nothing here runs unless a tag is
 * configured (src/lib/tags.ts).
 */
/** 'us': shows the "Do not sell or share" link; 'other': everyone else. Loading rules are the same. */
export type Region = 'us' | 'other';

export interface Choice { v: 1; analytics: boolean; marketing: boolean; t: number }

export const STORAGE_KEY = 'ct-consent';

/** Country from Cloudflare (ISO 3166-1 alpha-2). */
export function regionFor(country: string | null | undefined): Region {
  return country === 'US' ? 'us' : 'other';
}

export function defaultChoice(gpc: boolean, now = Date.now()): Choice {
  return { v: 1, analytics: !gpc, marketing: !gpc, t: now };
}

export function parseChoice(raw: string | null | undefined): Choice | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw);
    return c && c.v === 1 && typeof c.analytics === 'boolean' && typeof c.marketing === 'boolean' && typeof c.t === 'number'
      ? { v: 1, analytics: c.analytics, marketing: c.marketing, t: c.t }
      : null;
  } catch {
    return null;
  }
}

export function serializeChoice(c: Choice): string {
  return JSON.stringify(c);
}

/** What applies right now: the stored choice, else the default; GPC keeps marketing off either way. */
export function effectiveChoice(stored: Choice | null, gpc: boolean): Choice {
  const c = stored ?? defaultChoice(gpc);
  return gpc ? { ...c, marketing: false } : c;
}

export function bannerNeeded(stored: Choice | null): boolean {
  return stored === null;
}

type Granted = 'granted' | 'denied';

/** Google Consent Mode v2 signals for a choice. */
export function consentMode(c: Choice): Record<'analytics_storage' | 'ad_storage' | 'ad_user_data' | 'ad_personalization', Granted> {
  const a: Granted = c.analytics ? 'granted' : 'denied';
  const m: Granted = c.marketing ? 'granted' : 'denied';
  return { analytics_storage: a, ad_storage: m, ad_user_data: m, ad_personalization: m };
}
