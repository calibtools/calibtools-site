/**
 * Meta Pixel in a real browser, against a build that has PUBLIC_META_PIXEL_ID set:
 *   PUBLIC_META_PIXEL_ID=<id> SKIP_STOREFRONT_CHECK=1 SKIP_SPECS_CHECK=1 pnpm build
 *   node scripts/serve-dist.mjs 4321 &  PUBLIC_META_PIXEL_ID=<id> pnpm exec playwright test tests/e2e/meta-pixel.spec.ts
 * Requests to Meta are caught here and never leave the machine: the script is answered with an empty
 * file, so what the site asked the pixel to send stays readable in `fbq.queue`.
 * The stored choice is written with the site's own key and serializer (src/lib/consent.ts).
 */
import { test, expect, type Page } from '@playwright/test';
import { STORAGE_KEY, serializeChoice } from '../../src/lib/consent';

const PIXEL_ID = process.env.PUBLIC_META_PIXEL_ID ?? '';
test.skip(!/^\d{14,18}$/.test(PIXEL_ID), 'set PUBLIC_META_PIXEL_ID to the ID the site was built with');

const META = /(^|\.)(facebook\.com|facebook\.net|fbcdn\.net)$/;

async function watch(page: Page): Promise<string[]> {
  const seen: string[] = [];
  await page.route((url) => META.test(url.hostname), (route) => {
    const u = new URL(route.request().url());
    seen.push(u.hostname + u.pathname);
    return u.hostname === 'connect.facebook.net' ? route.fulfill({ contentType: 'text/javascript', body: '' }) : route.abort();
  });
  return seen;
}

const store = (page: Page, marketing: boolean) => page.addInitScript(([k, v]) => {
  if (!sessionStorage.getItem('ct-test-seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('ct-test-seeded', '1'); }
}, [STORAGE_KEY, serializeChoice({ v: 1, analytics: true, marketing, t: 1 })] as const);

const queue = (page: Page) => page.evaluate(() => {
  const q = (window as any).fbq?.queue as ArrayLike<unknown>[] | undefined;
  return q ? Array.from(q, (a) => Array.from(a)) : null;
});
const cookieNames = async (page: Page) => (await page.context().cookies()).map((c) => c.name);

test('marketing switched off: nothing is requested from Meta, no fbq, no _fbp', async ({ page }) => {
  const seen = await watch(page);
  await store(page, false);
  await page.goto('/');
  await page.goto('/targets/charuco-composite/');
  await page.waitForTimeout(1500);
  expect(seen).toEqual([]);
  expect(await queue(page)).toBeNull();
  expect(await cookieNames(page)).not.toContain('_fbp');
  expect(await page.content()).not.toMatch(/facebook\.net|facebook\.com\/tr/);
});

test('Global Privacy Control: nothing is requested from Meta', async ({ page }) => {
  const seen = await watch(page);
  await page.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }));
  await page.goto('/');
  await page.waitForTimeout(1500);
  expect(seen).toEqual([]);
  expect(await queue(page)).toBeNull();
});

test('first visit (site rule: on by default): script loads, init with the configured ID, one PageView', async ({ page }) => {
  const seen = await watch(page);
  await page.goto('/');
  await expect.poll(() => seen).toContain('connect.facebook.net/en_US/fbevents.js');
  expect(await queue(page)).toEqual([['set', 'autoConfig', false, PIXEL_ID], ['init', PIXEL_ID], ['track', 'PageView']]);
});

test('switching marketing on loads the pixel on the same page, without a reload', async ({ page }) => {
  const seen = await watch(page);
  await store(page, false);
  await page.goto('/');
  await page.waitForTimeout(800);
  expect(seen).toEqual([]);
  await page.evaluate(() => { (window as any).__sameDocument = true; });
  await page.locator('[data-consent-open]').first().click();
  await page.locator('button[data-consent-act="accept"]').click();
  await expect.poll(() => seen).toContain('connect.facebook.net/en_US/fbevents.js');
  expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
  expect((await queue(page))!.map((c) => c[1])).toEqual(['autoConfig', PIXEL_ID, 'PageView']);
});

test('product page sends ViewContent with a variant number, value and currency', async ({ page }) => {
  await watch(page);
  await page.goto('/targets/charuco-composite/');
  // A build without Storefront access (local fallback data) has no variants, so there is nothing to report.
  const hasVariants = await page.evaluate(() => /"variants":\[1,\[\[/.test(document.querySelector('astro-island[component-url*="VariantPicker"]')?.getAttribute('props') ?? ''));
  test.skip(!hasVariants, 'this build has no Shopify variants; checked on the preview deployment instead');
  await expect.poll(async () => ((await queue(page)) ?? []).map((c) => c[1])).toContain('ViewContent');
  const call = (await queue(page))!.find((c) => c[1] === 'ViewContent')!;
  const params = call[2] as Record<string, unknown>;
  expect(Object.keys(params).sort()).toEqual(['content_ids', 'content_type', 'currency', 'value']);
  expect(params.content_type).toBe('product');
  expect((params.content_ids as string[])[0]).toMatch(/^\d+$/);
  expect(params.value).toBeGreaterThan(0);
  expect(params.currency).toMatch(/^[A-Z]{3}$/);
});

test('Turn off: the next page asks Meta for nothing and Meta cookies are gone', async ({ page }) => {
  const seen = await watch(page);
  await page.goto('/');
  await expect.poll(() => seen.length).toBeGreaterThan(0);
  await page.context().addCookies([{ name: '_fbp', value: 'fb.1.1.1', domain: 'localhost', path: '/' }]);
  await page.locator('button[data-consent-act="choose"]').click();
  await Promise.all([page.waitForEvent('load'), page.locator('button.btn[data-consent-act="reject"]').click()]);
  seen.length = 0;
  await page.goto('/targets/charuco-composite/');
  await page.waitForTimeout(1500);
  expect(seen).toEqual([]);
  expect(await queue(page)).toBeNull();
  expect(await cookieNames(page)).not.toContain('_fbp');
});
