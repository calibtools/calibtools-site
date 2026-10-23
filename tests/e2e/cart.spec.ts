import { test, expect } from '@playwright/test';

test('Buy now still reaches Shopify checkout', async ({ page }) => {
  await page.goto('/targets/charuco-composite/');

  // Wait for the React island to hydrate
  const buyBtn = page.getByRole('button', { name: 'Buy now' });
  await expect(buyBtn).toBeEnabled({ timeout: 10_000 });

  // Price should be visible
  const priceText = page.locator('span.text-4xl');
  await expect(priceText).not.toHaveText('');

  // Click Buy now and wait for Shopify checkout redirect
  await buyBtn.click();
  await page.waitForURL(/\/cart\/c\/|checkout/, { timeout: 20_000, waitUntil: 'commit' });
  expect(page.url()).toMatch(/shop\.calib\.tools/);
});

test('add-ons appear and can be checked', async ({ page }) => {
  await page.goto('/targets/charuco-composite/');

  const buyBtn = page.getByRole('button', { name: 'Buy now' });
  await expect(buyBtn).toBeEnabled({ timeout: 10_000 });

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

  // Buy now with add-ons
  await buyBtn.click();
  await page.waitForURL(/\/cart\/c\/|checkout/, { timeout: 20_000, waitUntil: 'commit' });
  expect(page.url()).toMatch(/shop\.calib\.tools/);
});

test('Add to cart opens drawer with correct line', async ({ page }) => {
  await page.goto('/targets/charuco-composite/');

  // Wait for hydration
  const addBtn = page.getByRole('button', { name: 'Add to cart' });
  await expect(addBtn).toBeEnabled({ timeout: 10_000 });

  // Click Add to cart
  await addBtn.click();

  // Drawer should open with 1 line
  const drawer = page.getByRole('dialog', { name: 'Shopping cart' });
  await expect(drawer).toBeVisible({ timeout: 5_000 });

  const lines = drawer.getByTestId('cart-line');
  await expect(lines).toHaveCount(1);

  // Line should contain the product title
  await expect(lines.first()).toContainText('ChArUco');

  // Increase quantity to 2
  const increaseBtn = drawer.getByRole('button', { name: 'Increase quantity' });
  await increaseBtn.click();
  const qty = drawer.getByTestId('line-quantity');
  await expect(qty).toHaveText('2', { timeout: 10_000 });

  // Subtotal should update
  const subtotal = drawer.getByTestId('cart-subtotal');
  await expect(subtotal).not.toHaveText('');
});

test('Add fixture as second line, then remove one', async ({ page }) => {
  // Clear cart by clearing localStorage first
  await page.goto('/targets/charuco-composite/');
  await page.evaluate(() => localStorage.removeItem('calib-cart-id'));
  await page.reload();

  const addBtn = page.getByRole('button', { name: 'Add to cart' });
  await expect(addBtn).toBeEnabled({ timeout: 10_000 });

  // Add ChArUco
  await addBtn.click();
  const drawer = page.getByRole('dialog', { name: 'Shopping cart' });
  await expect(drawer).toBeVisible({ timeout: 5_000 });
  await expect(drawer.getByTestId('cart-line')).toHaveCount(1);

  // Close drawer
  await drawer.getByRole('button', { name: 'Close cart' }).click();

  // Navigate to fixture and add it
  await page.goto('/targets/mounting-fixture/');
  const addBtnFixture = page.getByRole('button', { name: 'Add to cart' });
  await expect(addBtnFixture).toBeEnabled({ timeout: 10_000 });
  await addBtnFixture.click();

  // Drawer should now have 2 lines
  const drawer2 = page.getByRole('dialog', { name: 'Shopping cart' });
  await expect(drawer2).toBeVisible({ timeout: 5_000 });
  await expect(drawer2.getByTestId('cart-line')).toHaveCount(2, { timeout: 10_000 });

  // Remove one line
  const removeButtons = drawer2.getByRole('button', { name: 'Remove' });
  await removeButtons.first().click();
  await expect(drawer2.getByTestId('cart-line')).toHaveCount(1, { timeout: 10_000 });

  // Checkout link should contain /cart/c/ or checkout
  const checkoutLink = drawer2.getByRole('link', { name: 'Checkout' });
  await expect(checkoutLink).toBeVisible();
  const href = await checkoutLink.getAttribute('href');
  expect(href).toMatch(/\/cart\/c\/|checkout/);
});
