import { test, expect } from '@playwright/test';

const PAGES = ['/', '/targets/', '/tools/', '/targets/charuco-composite/', '/faq/'];
const ALLOWED_HEIGHTS = new Set([32, 40, 48]);

/** Selector for elements using the btn sizing system (btn-sm, btn-md, btn-lg). */
const BTN_SEL = '[class*="btn-sm"], [class*="btn-md"], [class*="btn-lg"]';

for (const path of PAGES) {
  test(`btn heights on ${path} are in {32, 40, 48}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path, { waitUntil: 'networkidle' });

    const heights = await page.$$eval(BTN_SEL, (els) =>
      els
        .map((el) => Math.round(el.getBoundingClientRect().height))
        .filter((h) => h > 0),
    );

    for (const h of heights) {
      expect(
        [32, 40, 48].includes(h),
        `Button height ${h}px on ${path} not in allowed set {32, 40, 48}`,
      ).toBe(true);
    }
  });

  test(`btn heights on ${path} mobile are in {32, 40, 48}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path, { waitUntil: 'networkidle' });

    const heights = await page.$$eval(BTN_SEL, (els) =>
      els
        .map((el) => Math.round(el.getBoundingClientRect().height))
        .filter((h) => h > 0),
    );

    for (const h of heights) {
      expect(
        [32, 40, 48].includes(h),
        `Button height ${h}px on ${path} mobile not in allowed set {32, 40, 48}`,
      ).toBe(true);
    }
  });
}

test('btn-lg appears only inside the hero section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const path of PAGES) {
    await page.goto(path, { waitUntil: 'networkidle' });

    const lgOutsideHero = await page.$$eval('[class*="btn-lg"]', (els) =>
      els.filter((el) => {
        // Walk up to see if any ancestor is the hero (first section after nav)
        let node: Element | null = el;
        while (node) {
          if (node.getAttribute('data-hero') !== null) return false;
          if (node.tagName === 'SECTION' && node.querySelector('[data-hero-h1]')) return false;
          // Desktop hero wrapper
          if (node.classList.contains('container-x') && node.querySelector('[data-hero-h1]')) return false;
          node = node.parentElement;
        }
        return true;
      }).length,
    );

    expect(
      lgOutsideHero,
      `Found btn-lg outside hero on ${path}`,
    ).toBe(0);
  }
});
