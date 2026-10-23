import { test, expect } from '@playwright/test';

test('newsletter signup with mocked endpoint', async ({ page }) => {
  // Mock the subscribe endpoint
  await page.route('/api/subscribe', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    if (body.email && body.email.includes('@')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, state: 'SUBSCRIBED' }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: 'Invalid email.' }),
      });
    }
  });

  await page.goto('/');

  // Find the newsletter form
  const emailInput = page.getByPlaceholder('you@company.com');
  await expect(emailInput).toBeVisible({ timeout: 10_000 });

  // Fill and submit
  await emailInput.fill('test@example.com');
  const submitBtn = page.getByRole('button', { name: 'Subscribe' });
  await submitBtn.click();

  // Should show success message
  await expect(page.getByText(/Subscribed/)).toBeVisible({ timeout: 5_000 });
});

test('newsletter shows pending state for double opt-in', async ({ page }) => {
  await page.route('/api/subscribe', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, state: 'PENDING' }),
    });
  });

  await page.goto('/');

  const emailInput = page.getByPlaceholder('you@company.com');
  await expect(emailInput).toBeVisible({ timeout: 10_000 });

  await emailInput.fill('test@example.com');
  await page.getByRole('button', { name: 'Subscribe' }).click();

  await expect(page.getByText(/Check your inbox/)).toBeVisible({ timeout: 5_000 });
});
