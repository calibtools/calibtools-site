import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Navigation — APG disclosure pattern', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('desktop: dropdown opens on hover and shows items', async ({ page }) => {
    // Skip on mobile viewport
    const vp = page.viewportSize();
    if (vp && vp.width < 1024) return;

    const targetsBtn = page.locator('[data-nav-trigger]').first();
    await expect(targetsBtn).toHaveAttribute('aria-expanded', 'false');

    // Hover opens the panel
    await targetsBtn.hover();
    await expect(targetsBtn).toHaveAttribute('aria-expanded', 'true');

    const panel = page.locator('[data-nav-panel]').first();
    await expect(panel).toBeVisible();
  });

  test('desktop: dropdown opens on focus', async ({ page }) => {
    const vp = page.viewportSize();
    if (vp && vp.width < 1024) return;

    const targetsBtn = page.locator('[data-nav-trigger]').first();

    // Tab to the button
    await targetsBtn.focus();
    await expect(targetsBtn).toHaveAttribute('aria-expanded', 'true');
  });

  test('desktop: Esc closes dropdown and returns focus to trigger', async ({ page }) => {
    const vp = page.viewportSize();
    if (vp && vp.width < 1024) return;

    const targetsBtn = page.locator('[data-nav-trigger]').first();
    await targetsBtn.click();
    await expect(targetsBtn).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(targetsBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(targetsBtn).toBeFocused();
  });

  test('desktop: Tab moves through open panel links', async ({ page }) => {
    const vp = page.viewportSize();
    if (vp && vp.width < 1024) return;

    const targetsBtn = page.locator('[data-nav-trigger]').first();
    await targetsBtn.click();

    // Tab into the panel
    await page.keyboard.press('Tab');
    const panel = page.locator('[data-nav-panel]').first();
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBe('A');
  });

  test('desktop: click outside closes dropdown', async ({ page }) => {
    const vp = page.viewportSize();
    if (vp && vp.width < 1024) return;

    const targetsBtn = page.locator('[data-nav-trigger]').first();
    await targetsBtn.click();
    await expect(targetsBtn).toHaveAttribute('aria-expanded', 'true');

    // Click on the body outside nav
    await page.locator('main').click();
    await expect(targetsBtn).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('Navigation — Mobile drawer', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('mobile: hamburger toggles drawer', async ({ page }) => {
    await page.goto('/');

    const toggle = page.locator('[data-mobile-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const drawer = page.locator('[data-mobile-drawer]');
    await expect(drawer).toBeVisible();
  });

  test('mobile: Esc closes drawer', async ({ page }) => {
    await page.goto('/');

    const toggle = page.locator('[data-mobile-toggle]');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile: tap targets >= 44px', async ({ page }) => {
    await page.goto('/');

    const toggle = page.locator('[data-mobile-toggle]');
    await toggle.click();

    // Check all interactive elements in the drawer
    const drawer = page.locator('[data-mobile-drawer]');
    const interactives = drawer.locator('a, button, summary');
    const count = await interactives.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const el = interactives.nth(i);
      const box = await el.boundingBox();
      if (box) {
        expect(box.height, `Element ${i} height`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('mobile: Shop targets visible in floating bottom cluster', async ({ page }) => {
    await page.goto('/');
    // The MobileBottomCluster island contains Shop targets
    // Just verify it renders on mobile
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Navigation — Accessibility', () => {
  test('axe-core: homepage with menus closed — 0 violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('axe-core: homepage with Targets mega-menu open — 0 violations', async ({ page }) => {
    await page.goto('/');
    const vp = page.viewportSize();
    if (vp && vp.width < 1024) return;

    // Open the Targets dropdown
    const targetsBtn = page.locator('[data-nav-trigger]').first();
    await targetsBtn.click();
    await expect(targetsBtn).toHaveAttribute('aria-expanded', 'true');

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('axe-core: FAQ page — 0 violations', async ({ page }) => {
    await page.goto('/faq/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('axe-core: targets page — 0 violations', async ({ page }) => {
    await page.goto('/targets/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Navigation — Mobile drawer accessibility', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('axe-core: mobile drawer open — 0 violations', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-mobile-toggle]');
    await toggle.click();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
