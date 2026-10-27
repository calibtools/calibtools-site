import { test, expect } from '@playwright/test';

const FINISHED_GUIDE = '/guides/multi-board-marker-ids/';
const UNFINISHED_GUIDE = '/guides/composite-ceramic-or-glass/';

// ---------------------------------------------------------------------------
// Schema: all guides render without error
// ---------------------------------------------------------------------------

test('All four guide pages render', async ({ page }) => {
  for (const slug of [
    'multi-board-marker-ids',
    'charuco-vs-checkerboard-vs-aprilgrid',
    'composite-ceramic-or-glass',
    'printed-target-costs-half-a-pixel',
  ]) {
    const res = await page.goto(`/guides/${slug}/`);
    expect(res?.ok(), `Guide ${slug} returned ${res?.status()}`).toBe(true);
    await expect(page.locator('h1')).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// FAQPage JSON-LD present only when faq is non-empty
// ---------------------------------------------------------------------------

test('Finished guide has FAQPage JSON-LD', async ({ page }) => {
  await page.goto(FINISHED_GUIDE);
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const hasFaq = scripts.some((s) => s.includes('"FAQPage"'));
  expect(hasFaq).toBe(true);
});

test('Unfinished guide does NOT have FAQPage JSON-LD', async ({ page }) => {
  await page.goto(UNFINISHED_GUIDE);
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const hasFaq = scripts.some((s) => s.includes('"FAQPage"'));
  expect(hasFaq).toBe(false);
});

// ---------------------------------------------------------------------------
// Author JSON-LD is an Organization, no personal name in dist
// ---------------------------------------------------------------------------

test('Author JSON-LD is Organization named Calib.Tools', async ({ page }) => {
  await page.goto(FINISHED_GUIDE);
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const articleLd = scripts.find((s) => s.includes('"Article"'));
  expect(articleLd).toBeTruthy();
  const parsed = JSON.parse(articleLd!);
  expect(parsed.author['@type']).toBe('Organization');
  expect(parsed.author.name).toBe('Calib.Tools');
});

test('No personal name in guide page', async ({ page }) => {
  await page.goto(FINISHED_GUIDE);
  const body = await page.locator('body').textContent();
  // No first+last name patterns — only "Calib.Tools Engineering" or "Calib.Tools"
  expect(body).not.toMatch(/Written by [A-Z][a-z]+ [A-Z][a-z]+/);
});

// ---------------------------------------------------------------------------
// Index page sorted by updated desc
// ---------------------------------------------------------------------------

test('Guides index is sorted by updated desc', async ({ page }) => {
  await page.goto('/guides/');
  const dates = await page.locator('.spec').allTextContents();
  const dateStrings = dates.map((d) => d.match(/\d{4}-\d{2}-\d{2}/)?.[0]).filter(Boolean) as string[];
  expect(dateStrings.length).toBeGreaterThanOrEqual(2);
  // Verify descending order
  for (let i = 1; i < dateStrings.length; i++) {
    expect(dateStrings[i - 1] >= dateStrings[i]).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Short answer box renders only when keyRule present
// ---------------------------------------------------------------------------

test('Finished guide shows SHORT ANSWER box', async ({ page }) => {
  await page.goto(FINISHED_GUIDE);
  const box = page.locator('text=Short answer');
  await expect(box).toBeVisible();
});

test('Unfinished guide does NOT show SHORT ANSWER box', async ({ page }) => {
  await page.goto(UNFINISHED_GUIDE);
  const box = page.locator('text=Short answer');
  await expect(box).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// FAQ accordion renders only when faq present
// ---------------------------------------------------------------------------

test('Finished guide shows FAQ accordion', async ({ page }) => {
  await page.goto(FINISHED_GUIDE);
  const faqSection = page.locator('h2#faq');
  await expect(faqSection).toBeVisible();
  const details = page.locator('details');
  expect(await details.count()).toBeGreaterThanOrEqual(3);
});

test('Unfinished guide does NOT show FAQ section', async ({ page }) => {
  await page.goto(UNFINISHED_GUIDE);
  const faqSection = page.locator('h2#faq');
  await expect(faqSection).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// See a real report links
// ---------------------------------------------------------------------------

test('Finished guide shows "See a real report" block', async ({ page }) => {
  await page.goto(FINISHED_GUIDE);
  const block = page.locator('text=See a real report');
  await expect(block).toBeVisible();
});

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

test('Guide screenshot 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(FINISHED_GUIDE);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/guide-multi-board-1440.png', fullPage: true });
});

test('Guide screenshot 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(FINISHED_GUIDE);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/guide-multi-board-390.png', fullPage: true });
});
