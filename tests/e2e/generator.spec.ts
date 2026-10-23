import { test, expect } from '@playwright/test';

test('generator page loads and shows pattern generator heading', async ({ page }) => {
  await page.goto('/tools/generator/');
  await expect(page.locator('h1')).toContainText('Pattern generator');
});

test('generator shows SVG preview', async ({ page }) => {
  await page.goto('/tools/generator/');
  await expect(page.locator('svg[role="img"]')).toBeVisible();
});

test('changing pattern type updates preview', async ({ page }) => {
  await page.goto('/tools/generator/');
  // Wait for React hydration — URL gets pushed with default params
  await expect(page).toHaveURL(/type=/, { timeout: 10_000 });
  // Navigate directly to Checkerboard via URL (React reads URL state)
  await page.goto('/tools/generator/?type=Checkerboard&rows=7&cols=10&square=25');
  // Verify the select reflects Checkerboard
  await expect(page.locator('select').first()).toHaveValue('Checkerboard');
  // And the SVG preview updated
  await expect(page.locator('svg[role="img"]')).toHaveAttribute('aria-label', /Checkerboard/);
});

test('URL state round-trips pattern parameters', async ({ page }) => {
  await page.goto('/tools/generator/?type=Checkerboard&rows=5&cols=8&square=30');
  // Verify the SVG preview reflects the URL parameters via its aria-label
  await expect(page.locator('svg[role="img"]')).toHaveAttribute('aria-label', /5.*8/);
});
