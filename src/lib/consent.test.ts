import { describe, it, expect } from 'vitest';
import { regionFor, defaultChoice, parseChoice, serializeChoice, effectiveChoice, bannerNeeded, consentMode, STORAGE_KEY } from './consent';
import { cleanTagIds, anyTagConfigured, tagsToLoad, TAG_LABELS } from './tags';
import { readFileSync } from 'node:fs';

describe('region', () => {
  it('only decides the wording: United States or not', () => {
    expect(regionFor('US')).toBe('us');
    for (const c of ['DE', 'FR', 'GB', 'CH', 'JP', 'KR', '', undefined, 'XX', 'T1']) expect(regionFor(c), String(c)).toBe('other');
  });
});

describe('choice', () => {
  it('defaults: on for everyone, off with GPC', () => {
    expect(defaultChoice(false)).toMatchObject({ analytics: true, marketing: true });
    expect(defaultChoice(true)).toMatchObject({ analytics: false, marketing: false });
  });
  it('round-trips and rejects junk', () => {
    const c = { v: 1 as const, analytics: true, marketing: false, t: 1_800_000_000_000 };
    expect(parseChoice(serializeChoice(c))).toEqual(c);
    for (const bad of [null, '', 'x', '{}', '{"v":2,"analytics":true,"marketing":true,"t":1}', '{"v":1,"analytics":"yes","marketing":true,"t":1}']) expect(parseChoice(bad)).toBeNull();
    expect(STORAGE_KEY).toBe('ct-consent');
  });
  it('a stored choice wins, except that GPC still switches marketing off', () => {
    const stored = { v: 1 as const, analytics: true, marketing: true, t: 1 };
    expect(effectiveChoice(stored, false)).toEqual(stored);
    expect(effectiveChoice(stored, true)).toMatchObject({ analytics: true, marketing: false });
    expect(effectiveChoice(null, false)).toMatchObject({ analytics: true, marketing: true });
    expect(effectiveChoice(null, true)).toMatchObject({ analytics: false, marketing: false });
  });
  it('the banner shows until a choice is stored', () => {
    expect(bannerNeeded(null)).toBe(true);
    expect(bannerNeeded({ v: 1, analytics: false, marketing: false, t: 1 })).toBe(false);
  });
  it('maps to Google Consent Mode v2', () => {
    expect(consentMode({ v: 1, analytics: true, marketing: false, t: 1 })).toEqual({
      analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    });
  });
});

describe('tags', () => {
  const ids = cleanTagIds({ ga4: 'G-ABC123XYZ9', googleAds: 'AW-123456789', linkedin: '1234567', hubspot: '24681012' });
  it('accepts well-formed IDs only', () => {
    expect(ids).toEqual({ ga4: 'G-ABC123XYZ9', googleAds: 'AW-123456789', linkedin: '1234567', hubspot: '24681012' });
    expect(cleanTagIds({ ga4: 'G-<script>', googleAds: 'UA-1', linkedin: 'abc', hubspot: '' })).toEqual({});
    expect(cleanTagIds({})).toEqual({});
  });
  it('nothing configured means nothing to load and no banner', () => {
    expect(anyTagConfigured({})).toBe(false);
    expect(tagsToLoad({}, { v: 1, analytics: true, marketing: true, t: 1 })).toEqual([]);
  });
  it('loads only what the choice allows', () => {
    const none = tagsToLoad(ids, { v: 1, analytics: false, marketing: false, t: 1 });
    expect(none).toEqual([]);
    const analytics = tagsToLoad(ids, { v: 1, analytics: true, marketing: false, t: 1 });
    expect(analytics.map((t) => t.key)).toEqual(['ga4']);
    const all = tagsToLoad(ids, { v: 1, analytics: true, marketing: true, t: 1 });
    expect(all.map((t) => t.key)).toEqual(['ga4', 'googleAds', 'linkedin', 'hubspot']);
    for (const t of all) expect(t.src).toMatch(/^https:\/\//);
  });
  it('every tag that can be configured is named on the privacy page once it is switched on', () => {
    const privacy = readFileSync('src/pages/privacy.astro', 'utf8');
    const configured = cleanTagIds({
      ga4: process.env.PUBLIC_GA4_ID, googleAds: process.env.PUBLIC_GOOGLE_ADS_ID,
      linkedin: process.env.PUBLIC_LINKEDIN_PARTNER_ID, hubspot: process.env.PUBLIC_HUBSPOT_ID,
    });
    for (const key of Object.keys(configured) as (keyof typeof TAG_LABELS)[]) expect(privacy, key).toContain(TAG_LABELS[key]);
  });
  it('the banner and loader are only rendered when a tag is configured', () => {
    const base = readFileSync('src/layouts/Base.astro', 'utf8');
    expect(base).toMatch(/\{tagsOn && <ConsentBanner/);
  });
});
