import { test, expect } from '@playwright/test';

test.use({ browserName: 'chromium' });

/**
 * E2e tests for board-set ID ranges after the CART-1b fix.
 * Validates that each size produces the correct marker count per board.
 */
test.describe('board set ID ranges (CART-1b)', () => {

  test('charuco-composite 200×150 set of 2 → IDs 0–16, 17–33', async ({ page }) => {
    await page.goto('/targets/charuco-composite/');
    await expect(page.locator('h1')).toBeVisible();

    // Select 200 × 150 size (click the radio label containing the text)
    const sizeLabel = page.locator('label', { hasText: /200\s*[×x]\s*150/ });
    if (await sizeLabel.count() > 0) await sizeLabel.first().click();

    // Select 2 boards
    await page.locator('label', { hasText: '2 boards' }).click();

    // Check ID ranges
    const idTexts = page.locator('text=/IDs\\s+\\d+/');
    await expect(idTexts).toHaveCount(2);
    await expect(idTexts.nth(0)).toContainText('IDs 0\u201316');
    await expect(idTexts.nth(1)).toContainText('IDs 17\u201333');
  });

  test('charuco-composite 200×150 set of 2 then add again → continuation IDs 34–50, 51–67', async ({ page }) => {
    // This test verifies that adding the same set to an existing cart
    // produces continuation IDs.  Since we cannot mock the cart API in
    // e2e, we verify that the second set display (4 boards total)
    // produces correct consecutive ranges.
    await page.goto('/targets/charuco-composite/');
    await expect(page.locator('h1')).toBeVisible();

    const sizeLabel = page.locator('label', { hasText: /200\s*[×x]\s*150/ });
    if (await sizeLabel.count() > 0) await sizeLabel.first().click();

    await page.locator('label', { hasText: '4 boards' }).click();

    const idTexts = page.locator('text=/IDs\\s+\\d+/');
    await expect(idTexts).toHaveCount(4);
    await expect(idTexts.nth(0)).toContainText('IDs 0\u201316');
    await expect(idTexts.nth(1)).toContainText('IDs 17\u201333');
    await expect(idTexts.nth(2)).toContainText('IDs 34\u201350');
    await expect(idTexts.nth(3)).toContainText('IDs 51\u201367');
  });

  test('charuco-composite 800×600 DICT_6X6_250 set of 2 → IDs 0–81, 82–163', async ({ page }) => {
    await page.goto('/targets/charuco-composite/');
    await expect(page.locator('h1')).toBeVisible();

    // Select 800 × 600
    const sizeLabel = page.locator('label', { hasText: /800\s*[×x]\s*600/ });
    if (await sizeLabel.count() > 0) await sizeLabel.first().click();

    // Select DICT_6X6_250
    const dictLabel = page.locator('label', { hasText: 'DICT_6X6_250' });
    if (await dictLabel.count() > 0) await dictLabel.first().click();

    // Select 2 boards
    await page.locator('label', { hasText: '2 boards' }).click();

    const idTexts = page.locator('text=/IDs\\s+\\d+/');
    await expect(idTexts).toHaveCount(2);
    await expect(idTexts.nth(0)).toContainText('IDs 0\u201381');
    await expect(idTexts.nth(1)).toContainText('IDs 82\u2013163');
  });

  test('charuco-composite 800×600 with DICT_4X4_50 is disabled', async ({ page }) => {
    await page.goto('/targets/charuco-composite/');
    await expect(page.locator('h1')).toBeVisible();

    // Select 800 × 600
    const sizeLabel = page.locator('label', { hasText: /800\s*[×x]\s*600/ });
    if (await sizeLabel.count() > 0) await sizeLabel.first().click();

    // DICT_4X4_50 should be disabled
    const dict4x4Radio = page.locator('label', { hasText: 'DICT_4X4_50' }).locator('input[type="radio"]');
    if (await dict4x4Radio.count() > 0) {
      await expect(dict4x4Radio.first()).toBeDisabled();
    }
    // The label should have aria-disabled
    const dict4x4Label = page.locator('label[aria-disabled="true"]', { hasText: 'DICT_4X4_50' });
    if (await page.locator('label', { hasText: 'DICT_4X4_50' }).count() > 0) {
      await expect(dict4x4Label).toBeVisible();
    }
  });

  test('aprilgrid-composite 300×200 set of 2 → IDs 0–34, 35–69', async ({ page }) => {
    await page.goto('/targets/aprilgrid-composite/');
    await expect(page.locator('h1')).toBeVisible();

    // Select 300 × 200 size
    const sizeLabel = page.locator('label', { hasText: /300\s*[×x]\s*200/ });
    if (await sizeLabel.count() > 0) await sizeLabel.first().click();

    // Select 2 boards
    await page.locator('label', { hasText: '2 boards' }).click();

    const idTexts = page.locator('text=/IDs\\s+\\d+/');
    await expect(idTexts).toHaveCount(2);
    await expect(idTexts.nth(0)).toContainText('IDs 0\u201334');
    await expect(idTexts.nth(1)).toContainText('IDs 35\u201369');
  });
});
