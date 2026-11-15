/**
 * Cookie consent: region rule, the stored choice and what it allows.
 * Decided 2026-11-08: visitors in the United States get analytics and marketing tags by default and can
 * switch them off (with "Do not sell or share"); everyone else is asked first. A Global Privacy Control
 * signal always counts as "no" to marketing. Nothing here runs unless a tag is configured (src/lib/tags.ts).
 */
export type Region = 'optin' | 'optout';

export interface Choice { v: 1; analytics: boolean; marketing: boolean; t: number }

export const STORAGE_KEY = 'ct-consent';

/** Country from Cloudflare (ISO 3166-1 alpha-2). Unknown or missing is treated as opt-in. */
export function regionFor(country: string | null | undefined): Region {
  return country === 'US' ? 'optout' : 'optin';
}

export function defaultChoice(region: Region, gpc: boolean, now = Date.now()): Choice {
  const on = region === 'optout' && !gpc;
  return { v: 1, analytics: on, marketing: on, t: now };
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

/** What applies right now: the stored choice, else the region default; GPC keeps marketing off either way. */
export function effectiveChoice(stored: Choice | null, region: Region, gpc: boolean): Choice {
  const c = stored ?? defaultChoice(region, gpc);
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
