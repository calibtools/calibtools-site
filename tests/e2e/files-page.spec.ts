import { test, expect } from '@playwright/test';

test('/files/ page renders with datasheet tables', async ({ page }) => {
  await page.goto('/files/');
  await expect(page.locator('h1')).toContainText('Files');

  // Should have at least one table
  const tables = page.locator('table');
  await expect(tables.first()).toBeVisible();

  // Product datasheets section should exist
  await expect(page.locator('text=Product datasheets')).toBeVisible();

  // Common documents section should exist
  await expect(page.locator('text=Common documents')).toBeVisible();
});

test('/files/ each PDF link returns 200', async ({ page, request }) => {
  await page.goto('/files/');

  // Collect all PDF links
  const links = await page.locator('a[href$=".pdf"]').all();
  expect(links.length).toBeGreaterThan(0);

  for (const link of links) {
    const href = await link.getAttribute('href');
    if (!href) continue;

    const url = href.startsWith('http') ? href : `http://localhost:4321${href}`;
    const response = await request.get(url);
    expect(response.status(), `PDF ${href} should return 200`).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  }
});

test('/files/ DRAFT badges appear for draft documents', async ({ page }) => {
  await page.goto('/files/');

  // All current documents are draft status, so DRAFT badges should be visible
  const badges = page.locator('.badge:has-text("DRAFT")');
  const count = await badges.count();
  expect(count).toBeGreaterThan(0);
});
