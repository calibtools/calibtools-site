/**
 * Analytics and marketing tags. The only place that names a third-party script.
 * IDs come from build-time variables; with none set (today) no banner is rendered and nothing loads.
 * A tag that is switched on must be listed on /privacy/ (consent.test.ts checks it).
 */
import type { Choice } from './consent';

export type TagKey = 'ga4' | 'googleAds' | 'linkedin' | 'hubspot' | 'meta';
export type TagIds = Partial<Record<TagKey, string>>;

export const TAG_LABELS: Record<TagKey, string> = {
  ga4: 'Google Analytics',
  googleAds: 'Google Ads',
  linkedin: 'LinkedIn Insight Tag',
  hubspot: 'HubSpot',
  meta: 'Meta Pixel',
};

const FORMAT: Record<TagKey, RegExp> = {
  ga4: /^G-[A-Z0-9]{6,12}$/,
  googleAds: /^AW-\d{6,12}$/,
  linkedin: /^\d{5,9}$/,
  hubspot: /^\d{5,10}$/,
  meta: /^\d{14,18}$/,
};

const CATEGORY: Record<TagKey, 'analytics' | 'marketing'> = { ga4: 'analytics', googleAds: 'marketing', linkedin: 'marketing', hubspot: 'marketing', meta: 'marketing' };
const ORDER: TagKey[] = ['ga4', 'googleAds', 'linkedin', 'hubspot', 'meta'];

/** Keep only IDs in the expected format; anything else is dropped, so a typo cannot inject markup. */
export function cleanTagIds(raw: Partial<Record<TagKey, string | undefined>>): TagIds {
  const out: TagIds = {};
  for (const k of ORDER) {
    const v = (raw[k] ?? '').trim();
    if (FORMAT[k].test(v)) out[k] = v;
  }
  return out;
}

export function anyTagConfigured(ids: TagIds): boolean {
  return ORDER.some((k) => Boolean(ids[k]));
}

export interface TagToLoad { key: TagKey; id: string; src: string }

function srcFor(key: TagKey, id: string): string {
  if (key === 'ga4' || key === 'googleAds') return `https://www.googletagmanager.com/gtag/js?id=${id}`;
  if (key === 'linkedin') return 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  if (key === 'meta') return 'https://connect.facebook.net/en_US/fbevents.js';
  return `https://js.hs-scripts.com/${id}.js`;
}

export function tagsToLoad(ids: TagIds, choice: Choice): TagToLoad[] {
  return ORDER.filter((k) => ids[k] && choice[CATEGORY[k]]).map((k) => ({ key: k, id: ids[k]!, src: srcFor(k, ids[k]!) }));
}

/** IDs configured for this build. */
export const TAG_IDS: TagIds = cleanTagIds({
  ga4: import.meta.env.PUBLIC_GA4_ID,
  googleAds: import.meta.env.PUBLIC_GOOGLE_ADS_ID,
  linkedin: import.meta.env.PUBLIC_LINKEDIN_PARTNER_ID,
  hubspot: import.meta.env.PUBLIC_HUBSPOT_ID,
  meta: import.meta.env.PUBLIC_META_PIXEL_ID,
});

/**
 * Shopify's Customer Privacy API. Loaded only after a visitor has made a choice, to pass that choice
 * to the checkout on the shop domain. It sets Shopify's `_tracking_consent` cookie for calib.tools.
 */
export const SHOPIFY_CONSENT_SCRIPT = 'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.2/consent-tracking-api.js';
export const CHECKOUT_DOMAIN = 'shop.calib.tools';
export const STOREFRONT_DOMAIN = 'calib.tools';
export const STOREFRONT_TOKEN: string = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN ?? '';

/** First-party cookies set by tags of a category that is switched off; removed from the device right away. */
export function cookiesToDrop(names: string[], choice: Choice): string[] {
  return names.filter((n) =>
    (!choice.analytics && (n === '_ga' || n.startsWith('_ga_'))) ||
    (!choice.marketing && (n === 'hubspotutk' || n === '__hstc' || n === '__hssc' || n === '__hssrc' || n === '_fbp' || n === '_fbc')));
}
