import { test, expect } from '@playwright/test';

test('add to cart navigates to Shopify checkout', async ({ page }) => {
  await page.goto('/targets/charuco-composite/');

  // Wait for the React island to hydrate — the button should be enabled
  const addBtn = page.getByRole('button', { name: 'Add to cart' });
  await expect(addBtn).toBeEnabled({ timeout: 10_000 });

  // Pick the first size and dictionary (defaults are pre-selected, just verify)
  const priceText = page.locator('span.text-4xl');
  await expect(priceText).not.toHaveText('');

  // Click Add to cart and wait for Shopify checkout redirect
  await addBtn.click();
  await page.waitForURL(/\/cart\/c\/|checkout/, { timeout: 20_000, waitUntil: 'commit' });
  expect(page.url()).toMatch(/shop\.calib\.tools/);
});

test('add-ons appear and can be checked', async ({ page }) => {
  await page.goto('/targets/charuco-composite/');

  const addBtn = page.getByRole('button', { name: 'Add to cart' });
  await expect(addBtn).toBeEnabled({ timeout: 10_000 });

  // Check the certificate add-on
  const certCheckbox = page.getByRole('checkbox', { name: /certificate/i });
  await expect(certCheckbox).toBeVisible();
  await certCheckbox.check();
  await expect(certCheckbox).toBeChecked();

  // Check the fixture add-on
  const fixtureCheckbox = page.getByRole('checkbox', { name: /fixture/i });
  await expect(fixtureCheckbox).toBeVisible();
  await fixtureCheckbox.check();
  await expect(fixtureCheckbox).toBeChecked();

  // Add to cart with add-ons
  await addBtn.click();
  await page.waitForURL(/\/cart\/c\/|checkout/, { timeout: 20_000, waitUntil: 'commit' });
  expect(page.url()).toMatch(/shop\.calib\.tools/);
});
