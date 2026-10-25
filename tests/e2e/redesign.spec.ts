import { test, expect } from '@playwright/test';

test('Logo renders circle SVG with correct src for light page', async ({ page }) => {
  await page.goto('/tools/');
  const logo = page.locator('img[alt="Calib.Tools"]').first();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', '/brand/logo-circle-light.svg');
});

test('Logo renders circle SVG with correct src for dark page', async ({ page }) => {
  await page.goto('/');
  const logo = page.locator('img[alt="Calib.Tools"]').first();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', '/brand/logo-circle-dark.svg');
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
  await expect(page.locator('link[href="/favicon/calib-tools-favicon.svg"]')).toHaveCount(1);
  await expect(page.locator('link[rel="manifest"][href="/calib-tools.webmanifest"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test('Favicon and manifest files serve 200', async ({ page }) => {
  const res1 = await page.request.get('/favicon/calib-tools-favicon.svg');
  expect(res1.ok()).toBeTruthy();
  const res2 = await page.request.get('/calib-tools.webmanifest');
  expect(res2.ok()).toBeTruthy();
  const res3 = await page.request.get('/app/calib-tools-app-icon-192.png');
  expect(res3.ok()).toBeTruthy();
});

test('Hero image spans full section width at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Find the visible hero img (desktop one has md:block, mobile has md:hidden)
  const heroImgs = page.locator('#top img');
  const count = await heroImgs.count();
  let foundWidth = 0;
  for (let i = 0; i < count; i++) {
    const box = await heroImgs.nth(i).boundingBox();
    if (box && box.width > foundWidth) foundWidth = box.width;
  }
  expect(foundWidth).toBeGreaterThanOrEqual(1440 * 0.95);
});

test('Hero h1 is within left 50% at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const h1 = page.locator('#top h1');
  const box = await h1.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThan(1440 * 0.5);
});

test('Hero image spans full section width at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const heroImg = page.locator('#top img').first();
  const box = await heroImg.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(390 * 0.95);
});

test('Home page screenshot 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/home-1440.png', fullPage: true });
});

test('Home page screenshot 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/home-390.png', fullPage: true });
});
