import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

// ---------------------------------------------------------------------------
// Brand compliance: no red backgrounds except CTA buttons
// ---------------------------------------------------------------------------

test('No red background on home page except CTA buttons at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const redBgElements = await page.evaluate(() => {
    const results: { tag: string; classes: string; text: string }[] = [];
    const isRedBg = (color: string) => {
      // Match brand red backgrounds: rgb(230,0,18) or similar reds
      const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const [r, g, b] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
      return r > 180 && g < 60 && b < 60;
    };

    document.querySelectorAll('*').forEach((el) => {
      const style = getComputedStyle(el);
      if (isRedBg(style.backgroundColor)) {
        const tag = el.tagName.toLowerCase();
        const classes = el.className?.toString() ?? '';
        const text = el.textContent?.trim().slice(0, 40) ?? '';
        // Skip small decorative accents (dots, rule segments < 32px in any dimension)
        const rect = el.getBoundingClientRect();
        if (rect.width < 32 || rect.height < 8) return;
        results.push({ tag, classes, text });
      }
    });
    return results;
  });

  // Only <a> CTA buttons should have red backgrounds
  for (const el of redBgElements) {
    expect(
      el.tag === 'a' || el.tag === 'button',
      `Non-button element <${el.tag}> has red background: "${el.text}" (${el.classes})`
    ).toBe(true);
  }
});

test('No red background on home page except CTA buttons at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const redBgElements = await page.evaluate(() => {
    const results: { tag: string; classes: string; text: string }[] = [];
    const isRedBg = (color: string) => {
      const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const [r, g, b] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
      return r > 180 && g < 60 && b < 60;
    };

    document.querySelectorAll('*').forEach((el) => {
      const style = getComputedStyle(el);
      if (isRedBg(style.backgroundColor)) {
        const tag = el.tagName.toLowerCase();
        const classes = el.className?.toString() ?? '';
        const text = el.textContent?.trim().slice(0, 40) ?? '';
        const rect = el.getBoundingClientRect();
        if (rect.width < 32 || rect.height < 8) return;
        results.push({ tag, classes, text });
      }
    });
    return results;
  });

  for (const el of redBgElements) {
    expect(
      el.tag === 'a' || el.tag === 'button',
      `Non-button element <${el.tag}> has red background: "${el.text}" (${el.classes})`
    ).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Nav links font-weight 600
// ---------------------------------------------------------------------------

test('Nav links use font-weight 600 (SemiBold)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const navLinks = page.locator('nav a[href]:not([aria-label])').filter({ hasNotText: /Shop targets/ });
  const count = await navLinks.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const weight = await navLinks.nth(i).evaluate(
      (el) => getComputedStyle(el).fontWeight,
    );
    expect(weight).toBe('600');
  }
});

// ---------------------------------------------------------------------------
// Overlay config: correct part numbers
// ---------------------------------------------------------------------------

test('brand-overlay.py config uses 300200 part numbers, not 300240', () => {
  const overlayScript = readFileSync(
    resolve(import.meta.dirname, '../../scripts/brand-overlay.py'),
    'utf-8',
  );
  expect(overlayScript).toContain('300200');
  expect(overlayScript).not.toContain('300240');
});

test('brand-overlay.py config uses 185110 ceramic board, not 200150', () => {
  const overlayScript = readFileSync(
    resolve(import.meta.dirname, '../../scripts/brand-overlay.py'),
    'utf-8',
  );
  expect(overlayScript).toContain('185110');
  expect(overlayScript).not.toContain('200150');
});

// ---------------------------------------------------------------------------
// Tagline and micron claim guard
// ---------------------------------------------------------------------------

test('Home H1 displays TAGLINE in correct form', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const h1 = page.locator('[data-hero-h1]');
  const text = (await h1.innerText())?.replace(/\s+/g, ' ').trim().toUpperCase();
  expect(text).toBe('KNOW YOUR TARGET TO THE MICRON');
});

test('Composite product page does not contain "micron"', async ({ page }) => {
  await page.goto('/targets/charuco-composite/');
  const body = await page.locator('main').textContent();
  expect(body?.toLowerCase()).not.toContain('micron');
});

test('Composite collection page does not contain "micron"', async ({ page }) => {
  await page.goto('/targets/collection/composite-boards/');
  const body = await page.locator('main').textContent();
  expect(body?.toLowerCase()).not.toContain('micron');
});

test('Checkerboard composite product page does not contain "micron"', async ({ page }) => {
  await page.goto('/targets/checkerboard-composite/');
  const body = await page.locator('main').textContent();
  expect(body?.toLowerCase()).not.toContain('micron');
});

test('Composite product page screenshot 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/targets/charuco-composite/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/product-composite-1440.png', fullPage: true });
});

test('Ceramic collection screenshot 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/targets/collection/ceramic-glass/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/collection-ceramic-1440.png', fullPage: true });
});
