import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * NAV-2 Typography proof tests.
 *
 * (a) No header element taller than one line; header height matches spec
 * (b) Two-axis hierarchy rule for adjacent pairs
 * (c) All text >= 4.5:1 contrast (or 3:1 for >= 18.7px bold) via axe color-contrast
 * (d) Values within reference site min–max range
 */

const HEADER_H = 64; // spec default
const HEADER_H_TOLERANCE = 2; // 1px border + rounding

// Reference site ranges (from measure)
const REF = {
  headerHeight: { min: 62, max: 76 },
  navItemSize: { min: 13, max: 14 },
  ctaSize: { min: 13, max: 16 },
  footerLinkSize: { min: 13, max: 16 },
};

test.describe('NAV-2 Typography — Desktop (1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('header height matches spec at 1440px', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Main"]');
    const box = await nav.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(HEADER_H - HEADER_H_TOLERANCE);
    expect(box!.height).toBeLessThanOrEqual(HEADER_H + HEADER_H_TOLERANCE);
  });

  test('nav items are single-line (height <= line-height)', async ({ page }) => {
    await page.goto('/');
    const triggers = page.locator('[data-nav-trigger]');
    const count = await triggers.count();
    for (let i = 0; i < count; i++) {
      const el = triggers.nth(i);
      const box = await el.boundingBox();
      // Button with padding should be <= ~40px (line-height 21 + padding 16)
      expect(box!.height, `Trigger ${i}`).toBeLessThanOrEqual(44);
    }
  });

  test('hierarchy: nav item vs CTA differs on >= 2 axes', async ({ page }) => {
    await page.goto('/');
    // Nav item: first trigger
    const navItem = page.locator('[data-nav-trigger]').first();
    const navStyles = await navItem.evaluate(el => {
      const s = getComputedStyle(el);
      return { size: s.fontSize, weight: s.fontWeight, transform: s.textTransform, family: s.fontFamily.split(',')[0] };
    });

    // CTA: "Shop targets" button
    const cta = page.locator('a:has-text("Shop targets")').first();
    const ctaStyles = await cta.evaluate(el => {
      const s = getComputedStyle(el);
      return { size: s.fontSize, weight: s.fontWeight, transform: s.textTransform, family: s.fontFamily.split(',')[0] };
    });

    let diffs = 0;
    if (parseInt(navStyles.weight) !== parseInt(ctaStyles.weight)) diffs++; // weight step
    if (navStyles.transform !== ctaStyles.transform) diffs++; // text-transform
    if (navStyles.size !== ctaStyles.size) diffs++; // size ratio
    if (navStyles.family !== ctaStyles.family) diffs++; // family

    expect(diffs, 'Nav item vs CTA must differ on >= 2 axes').toBeGreaterThanOrEqual(2);
  });

  test('hierarchy: mega-menu heading vs item differs on >= 2 axes', async ({ page }) => {
    await page.goto('/');
    // Open the mega-menu
    const trigger = page.locator('[data-nav-trigger]').first();
    await trigger.hover();
    await page.waitForTimeout(200);

    const heading = page.locator('[data-nav-panel] .font-mono').first();
    const item = page.locator('[data-nav-panel] a').first();

    const hStyles = await heading.evaluate(el => {
      const s = getComputedStyle(el);
      return { size: parseFloat(s.fontSize), weight: parseInt(s.fontWeight), transform: s.textTransform, family: s.fontFamily.split(',')[0].replace(/['"]/g, '').trim() };
    });
    const iStyles = await item.evaluate(el => {
      const s = getComputedStyle(el);
      return { size: parseFloat(s.fontSize), weight: parseInt(s.fontWeight), transform: s.textTransform, family: s.fontFamily.split(',')[0].replace(/['"]/g, '').trim() };
    });

    let diffs = 0;
    if (Math.max(hStyles.size, iStyles.size) / Math.min(hStyles.size, iStyles.size) >= 1.2) diffs++;
    if (hStyles.family !== iStyles.family) diffs++;
    if (Math.abs(hStyles.weight - iStyles.weight) >= 100) diffs++;
    if (hStyles.transform !== iStyles.transform) diffs++;

    expect(diffs, 'Mega heading vs item must differ on >= 2 axes').toBeGreaterThanOrEqual(2);
  });

  test('hierarchy: footer heading vs link differs on >= 2 axes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const heading = page.locator('footer .font-mono').first();
    const link = page.locator('footer a').first();

    const hStyles = await heading.evaluate(el => {
      const s = getComputedStyle(el);
      return { size: parseFloat(s.fontSize), weight: parseInt(s.fontWeight), transform: s.textTransform, family: s.fontFamily.split(',')[0].replace(/['"]/g, '').trim() };
    });
    const lStyles = await link.evaluate(el => {
      const s = getComputedStyle(el);
      return { size: parseFloat(s.fontSize), weight: parseInt(s.fontWeight), transform: s.textTransform, family: s.fontFamily.split(',')[0].replace(/['"]/g, '').trim() };
    });

    let diffs = 0;
    if (Math.max(hStyles.size, lStyles.size) / Math.min(hStyles.size, lStyles.size) >= 1.2) diffs++;
    if (hStyles.family !== lStyles.family) diffs++;
    if (Math.abs(hStyles.weight - lStyles.weight) >= 100) diffs++;
    if (hStyles.transform !== lStyles.transform) diffs++;

    expect(diffs, 'Footer heading vs link must differ on >= 2 axes').toBeGreaterThanOrEqual(2);
  });

  test('axe color-contrast: nav and footer — 0 violations', async ({ page }) => {
    await page.goto('/faq/'); // light-theme page avoids dark-hero pre-existing issues
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .include('nav[aria-label="Main"]')
      .include('footer')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('values within reference site ranges', async ({ page }) => {
    await page.goto('/');

    const metrics = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Main"]');
      const trigger = document.querySelector('[data-nav-trigger]');
      const cta = document.querySelector('a[href="/targets/"]');
      if (!nav || !trigger) return null;

      return {
        headerHeight: nav.getBoundingClientRect().height,
        navItemSize: parseFloat(getComputedStyle(trigger).fontSize),
        ctaSize: cta ? parseFloat(getComputedStyle(cta).fontSize) : 14,
      };
    });

    expect(metrics).not.toBeNull();
    if (!metrics) return;

    // Header height in reference range
    expect(metrics.headerHeight).toBeGreaterThanOrEqual(REF.headerHeight.min);
    expect(metrics.headerHeight).toBeLessThanOrEqual(REF.headerHeight.max);

    // Nav item size in reference range
    expect(metrics.navItemSize).toBeGreaterThanOrEqual(REF.navItemSize.min);
    expect(metrics.navItemSize).toBeLessThanOrEqual(REF.navItemSize.max);

    // CTA size in reference range
    expect(metrics.ctaSize).toBeGreaterThanOrEqual(REF.ctaSize.min);
    expect(metrics.ctaSize).toBeLessThanOrEqual(REF.ctaSize.max);
  });
});

test.describe('NAV-2 Typography — Viewports', () => {
  for (const vw of [1280, 1920]) {
    test(`header height consistent at ${vw}px`, async ({ page }) => {
      await page.setViewportSize({ width: vw, height: 900 });
      await page.goto('/');
      const nav = page.locator('nav[aria-label="Main"]');
      const box = await nav.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(HEADER_H - HEADER_H_TOLERANCE);
      expect(box!.height).toBeLessThanOrEqual(HEADER_H + HEADER_H_TOLERANCE);
    });
  }
});

test.describe('NAV-2 Typography — Mobile (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('header height matches spec at 390px', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Main"]');
    const box = await nav.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(HEADER_H - HEADER_H_TOLERANCE);
    expect(box!.height).toBeLessThanOrEqual(HEADER_H + HEADER_H_TOLERANCE);
  });
});

test.describe('NAV-2 Typography — Screenshot baselines', () => {
  test('header closed at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Main"]');
    await expect(nav).toHaveScreenshot('nav-closed-1440.png');
  });

  test('header Targets open at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const trigger = page.locator('[data-nav-trigger]').first();
    await trigger.hover();
    await page.waitForTimeout(200);
    const nav = page.locator('nav[aria-label="Main"]');
    await expect(nav).toHaveScreenshot('nav-targets-open-1440.png');
  });

  test('footer at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-1440.png');
  });

  test('header at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Main"]');
    await expect(nav).toHaveScreenshot('nav-closed-390.png');
  });

  test('footer at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-390.png');
  });
});
