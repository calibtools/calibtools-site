import { test, expect } from '@playwright/test';

test.describe('disclosure deep-linking', () => {
  test('hash #in-the-box opens the In the box disclosure', async ({ page }) => {
    await page.goto('/targets/charuco-composite/#in-the-box');
    const details = page.locator('details#in-the-box');
    await expect(details).toHaveAttribute('open', '');
  });

  test('hash #compatibility opens the Compatibility disclosure', async ({ page }) => {
    await page.goto('/targets/charuco-composite/#compatibility');
    const details = page.locator('details#compatibility');
    await expect(details).toHaveAttribute('open', '');
  });

  test('hash #faq opens the FAQ disclosure', async ({ page }) => {
    await page.goto('/targets/charuco-composite/#faq');
    const details = page.locator('details#faq');
    await expect(details).toHaveAttribute('open', '');
  });

  test('specifications section is visible without hash (not in details)', async ({ page }) => {
    await page.goto('/targets/charuco-composite/');
    const specs = page.locator('#specifications');
    await expect(specs).toBeVisible();
    // Verify it's NOT inside a <details> element
    const parentDetails = page.locator('details #specifications');
    await expect(parentDetails).toHaveCount(0);
  });
});
