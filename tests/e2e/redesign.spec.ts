import { test, expect } from '@playwright/test';

test('Desktop shows horizontal lockup on light page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools/');
  const logo = page.locator('nav img[alt="Calib.Tools"]').first();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', '/brand/lockup-light.svg');
});

test('Desktop shows horizontal lockup on dark page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const logo = page.locator('nav img[alt="Calib.Tools"]').first();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', '/brand/lockup-dark.svg');
});

test('Mobile shows icon (not lockup) at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools/');
  const icon = page.locator('nav img[alt="Calib.Tools"]').last();
  await expect(icon).toBeVisible();
  await expect(icon).toHaveAttribute('src', '/brand/icon-light.svg');
});

test('Only index sets data-theme=dark', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.goto('/tools/');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');

  await page.goto('/targets/');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
});

test('Header is sticky', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('nav');
  await expect(nav).toHaveCSS('position', 'sticky');
});

test('Mobile header has hamburger and logo, no cart', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  // Hamburger visible
  await expect(page.locator('[data-menu-toggle]')).toBeVisible();
  // Logo visible (mobile centered logo — second img, the one outside the hidden desktop container)
  await expect(page.locator('nav img[alt="Calib.Tools"]').last()).toBeVisible();
  // Cart NOT visible in header
  await expect(page.locator('nav [data-open-cart]')).not.toBeVisible();
});

test('Favicon links present in head', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[href="/favicon.ico"]')).toHaveCount(1);
  await expect(page.locator('link[rel="manifest"][href="/site.webmanifest"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('link[rel="mask-icon"]')).toHaveCount(1);
});

test('Favicon and manifest files serve 200', async ({ page }) => {
  const res1 = await page.request.get('/favicon.ico');
  expect(res1.ok()).toBeTruthy();
  const res2 = await page.request.get('/site.webmanifest');
  expect(res2.ok()).toBeTruthy();
  const res3 = await page.request.get('/apple-touch-icon.png');
  expect(res3.ok()).toBeTruthy();
  const res4 = await page.request.get('/favicon-32x32.png');
  expect(res4.ok()).toBeTruthy();
  const res5 = await page.request.get('/safari-pinned-tab.svg');
  expect(res5.ok()).toBeTruthy();
  const res6 = await page.request.get('/android-chrome-192x192.png');
  expect(res6.ok()).toBeTruthy();
});

test('Hero image height ≥ 85% of its column at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const img = page.locator('[data-hero-img]');
  const col = page.locator('[data-hero-col]');
  const imgBox = await img.boundingBox();
  const colBox = await col.boundingBox();
  expect(imgBox).not.toBeNull();
  expect(colBox).not.toBeNull();
  expect(imgBox!.height).toBeGreaterThanOrEqual(colBox!.height * 0.85);
});

test('Hero image height ≥ 85% of its column at 1280px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const img = page.locator('[data-hero-img]');
  const col = page.locator('[data-hero-col]');
  const imgBox = await img.boundingBox();
  const colBox = await col.boundingBox();
  expect(imgBox).not.toBeNull();
  expect(colBox).not.toBeNull();
  expect(imgBox!.height).toBeGreaterThanOrEqual(colBox!.height * 0.85);
});

test('Hero h1 box never intersects hero img box at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const h1 = page.locator('[data-hero-h1]');
  const img = page.locator('[data-hero-img]');
  const h1Box = await h1.boundingBox();
  const imgBox = await img.boundingBox();
  expect(h1Box).not.toBeNull();
  expect(imgBox).not.toBeNull();
  // h1 right edge must be left of img left edge (no overlap)
  expect(h1Box!.x + h1Box!.width).toBeLessThanOrEqual(imgBox!.x + 1);
});

test('Home page screenshot 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/home-1440.png', fullPage: true });
});

test('Home page screenshot 1280px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/home-1280.png', fullPage: true });
});

test('Home page screenshot 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/home-390.png', fullPage: true });
});
