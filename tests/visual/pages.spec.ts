import { test, expect } from '@playwright/test';

const PAGES: [name: string, path: string][] = [
  ['home', '/'],
  ['targets', '/targets/'],
  ['product-charuco', '/targets/charuco-composite/'],
  ['generator', '/tools/generator/'],
];
const WIDTHS: [label: string, width: number, height: number][] = [['1440', 1440, 900], ['390', 390, 844]];

for (const [name, path] of PAGES) {
  for (const [label, width, height] of WIDTHS) {
    test(`${name} at ${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');
      // Prices come from the store and change without a code change
      const prices = page.locator('[data-price], .font-mono:text-matches("^(from )?[$€£]")');
      await expect(page).toHaveScreenshot(`${name}-${label}.png`, { mask: [prices] });
    });
  }
}
