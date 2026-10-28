import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * CONTRAST-1 guard: full-page axe color-contrast on key pages.
 * No .include() scoping — every element on the page must pass.
 */

const pages = ['/', '/tools/', '/targets/'];

for (const path of pages) {
  test(`axe color-contrast: ${path} — 0 violations`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    if (results.violations.length > 0) {
      const details = results.violations.flatMap((v) =>
        v.nodes.map((n) => {
          const d = n.any?.find((a) => a.id === 'color-contrast')?.data as any;
          return `${n.target.join(' > ')} — FG:${d?.fgColor} BG:${d?.bgColor} ratio:${d?.contrastRatio}`;
        }),
      );
      console.log('Contrast violations:\n' + details.join('\n'));
    }

    expect(results.violations).toEqual([]);
  });
}
