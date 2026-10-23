import { test, expect } from '@playwright/test';

test('generator preview fits at 1440px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/tools/generator/');
  await page.waitForTimeout(1500);

  // The SVG should not overflow its container
  const container = page.locator('[class*="overflow-hidden"][class*="bg-ground-panel"]');
  await expect(container).toBeVisible();
  const svg = container.locator('svg');
  await expect(svg).toBeVisible();

  await page.screenshot({ path: 'screenshots/generator-1440.png', fullPage: true });
  await ctx.close();
});

test('generator preview fits at 390px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('/tools/generator/');
  await page.waitForTimeout(1500);

  const container = page.locator('[class*="overflow-hidden"][class*="bg-ground-panel"]');
  await expect(container).toBeVisible();
  const svg = container.locator('svg');
  await expect(svg).toBeVisible();

  await page.screenshot({ path: 'screenshots/generator-390.png', fullPage: true });
  await ctx.close();
});
