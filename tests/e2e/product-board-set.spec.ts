import { test, expect } from '@playwright/test';

test.describe('product page: board set UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/targets/charuco-composite/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('charuco product page shows board set fieldset', async ({ page }) => {
    // Board set legend should be visible (rendered because handle includes "charuco")
    const boardSet = page.locator('legend', { hasText: 'Board set' });
    await expect(boardSet).toBeVisible();

    // Should have radio buttons for 1, 2, 3, 4
    await expect(page.locator('label', { hasText: '1 board' })).toBeVisible();
    await expect(page.locator('label', { hasText: '2 boards' })).toBeVisible();
    await expect(page.locator('label', { hasText: '3 boards' })).toBeVisible();
    await expect(page.locator('label', { hasText: '4 boards' })).toBeVisible();

    // Should have the 5+ custom input
    await expect(page.locator('input[type="number"][placeholder="5+"]')).toBeVisible();
  });

  test('1 board is selected by default with no ID range table', async ({ page }) => {
    // Default is 1 board — no ID range rows should be shown
    // The ID range panel only appears when boardCount >= 2
    const idRangeRows = page.locator('text=/IDs\\s+\\d+/');
    await expect(idRangeRows).toHaveCount(0);
  });

  test('selecting 2 boards shows 2 ID range rows', async ({ page }) => {
    await page.locator('label', { hasText: '2 boards' }).click();

    // Should show 2 rows with "IDs <min>–<max>" (en-dash U+2013)
    const idRangeRows = page.locator('text=/IDs\\s+\\d+/');
    await expect(idRangeRows).toHaveCount(2);

    // Each row should have a "Board N" label
    await expect(page.locator('text=Board 1')).toBeVisible();
    await expect(page.locator('text=Board 2')).toBeVisible();
  });

  test('selecting 3 boards shows 3 ID range rows', async ({ page }) => {
    await page.locator('label', { hasText: '3 boards' }).click();

    const idRangeRows = page.locator('text=/IDs\\s+\\d+/');
    await expect(idRangeRows).toHaveCount(3);
  });

  test('switching from 3 boards back to 1 hides ID ranges', async ({ page }) => {
    // First select 3 boards
    await page.locator('label', { hasText: '3 boards' }).click();
    await expect(page.locator('text=/IDs\\s+\\d+/')).toHaveCount(3);

    // Then back to 1 board
    await page.locator('label', { hasText: '1 board' }).click();

    // No ID ranges should be shown
    await expect(page.locator('text=/IDs\\s+\\d+/')).toHaveCount(0);
  });

  test('selecting 4 boards shows 4 ID range rows', async ({ page }) => {
    await page.locator('label', { hasText: '4 boards' }).click();

    const idRangeRows = page.locator('text=/IDs\\s+\\d+/');
    await expect(idRangeRows).toHaveCount(4);
  });

  test('custom 5+ input sets board count', async ({ page }) => {
    const customInput = page.locator('input[type="number"][placeholder="5+"]');
    await customInput.fill('6');

    const idRangeRows = page.locator('text=/IDs\\s+\\d+/');
    await expect(idRangeRows).toHaveCount(6);
  });
});
