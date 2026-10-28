import { test, expect } from '@playwright/test';

const PAGES = ['/', '/targets/', '/tools/', '/targets/charuco-composite/', '/faq/'];

/** Selector for elements using the btn sizing system. */
const BTN_SEL = '[class*="btn-md"]';

for (const path of PAGES) {
  test(`btn heights on ${path} desktop are exactly 40 px`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path, { waitUntil: 'networkidle' });

    const heights = await page.$$eval(BTN_SEL, (els) =>
      els
        .map((el) => Math.round(el.getBoundingClientRect().height))
        .filter((h) => h > 0),
    );

    for (const h of heights) {
      expect(h, `Button height ${h}px on ${path} desktop — expected 40`).toBe(40);
    }
  });

  test(`btn heights on ${path} mobile are exactly 40 px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path, { waitUntil: 'networkidle' });

    const heights = await page.$$eval(BTN_SEL, (els) =>
      els
        .map((el) => Math.round(el.getBoundingClientRect().height))
        .filter((h) => h > 0),
    );

    for (const h of heights) {
      expect(h, `Button height ${h}px on ${path} mobile — expected 40`).toBe(40);
    }
  });
}
