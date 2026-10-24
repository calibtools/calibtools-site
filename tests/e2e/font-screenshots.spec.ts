import { test } from '@playwright/test';

const pages = [
  { name: 'home', url: '/' },
  { name: 'product-charuco-composite', url: '/targets/charuco-composite/' },
  { name: 'generator', url: '/tools/generator/' },
  { name: 'cart', url: '/cart/' },
  { name: 'guides-index', url: '/guides/' },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const page of pages) {
  for (const vp of viewports) {
    test(`screenshot ${page.name} at ${vp.name} (${vp.width}px)`, async ({ page: p }) => {
      await p.setViewportSize({ width: vp.width, height: vp.height });
      await p.goto(page.url, { waitUntil: 'networkidle' });
      await p.screenshot({
        path: `tests/e2e/screenshots/fonts-${page.name}-${vp.name}.png`,
        fullPage: true,
      });
    });
  }
}
