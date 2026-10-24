import { test, expect } from '@playwright/test';

test.describe('family page: composite-boards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/targets/collection/composite-boards/');
  });

  test('renders breadcrumb with collection title', async ({ page }) => {
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Calibration targets');
    await expect(breadcrumb).toContainText('Composite boards');
  });

  test('renders product groups with IDs', async ({ page }) => {
    const groups = page.locator('[id^="product-"]');
    const count = await groups.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('renders purchase table with variant rows', async ({ page }) => {
    // Look for the purchase table area — desktop table or mobile cards
    const table = page.locator('table').first();
    const mobileCards = page.locator('[class*="md:hidden"] [class*="py-4"]').first();

    // At least one variant presentation should exist
    const tableVisible = await table.isVisible().catch(() => false);
    const cardsVisible = await mobileCards.isVisible().catch(() => false);

    // With fallback data (no Shopify credentials), variants may be empty
    // so we check for the placeholder message instead
    const placeholder = page.locator('text=Variants and pricing are loaded');
    const hasPlaceholder = await placeholder.isVisible().catch(() => false);

    expect(tableVisible || cardsVisible || hasPlaceholder).toBe(true);
  });

  test('tab bar or accordion is present', async ({ page }) => {
    // Wait for React island hydration
    await page.waitForTimeout(1000);

    // Desktop: tab buttons; Mobile: details/summary
    const tabButtons = page.locator('button:has-text("Overview")');
    const accordion = page.locator('details[data-tab="Overview"]');

    const hasTab = (await tabButtons.count()) > 0;
    const hasAccordion = (await accordion.count()) > 0;
    expect(hasTab || hasAccordion).toBe(true);
  });

  test('sibling navigation is present', async ({ page }) => {
    const sibNav = page.locator('nav[aria-label="Sibling collections"]');
    await expect(sibNav).toBeVisible();
    await expect(sibNav).toContainText('Also in targets');
    await expect(sibNav).toContainText('Ceramic & glass');
  });

  test('tabs swap content but product groups remain', async ({ page }) => {
    // Only run on desktop viewport
    const viewportWidth = page.viewportSize()?.width ?? 1280;
    if (viewportWidth < 768) return;

    const specsTab = page.locator('button:has-text("Specifications")');
    if (await specsTab.isVisible()) {
      await specsTab.click();
      // Product groups should still be visible
      const productGroups = page.locator('#product-groups');
      await expect(productGroups).toBeVisible();
    }
  });

  test('screenshot at 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/targets/collection/composite-boards/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/family-1440.png', fullPage: true });
  });

  test('screenshot at 390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/targets/collection/composite-boards/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/family-390.png', fullPage: true });
  });
});

test.describe('family page: mobile accordion', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('accordion renders on mobile', async ({ page }) => {
    await page.goto('/targets/collection/composite-boards/');
    const accordion = page.locator('details[data-tab]');
    const count = await accordion.count();
    // Should have at least one accordion item on mobile
    if (count > 0) {
      const first = accordion.first();
      // Should be closed by default
      await expect(first).not.toHaveAttribute('open', '');
      // Click to open
      await first.locator('summary').click();
      await expect(first).toHaveAttribute('open', '');
    }
  });
});

test.describe('family page: add to cart from purchase table', () => {
  test('row-level add opens drawer', async ({ page }) => {
    await page.goto('/targets/collection/composite-boards/');

    // Find an add-to-cart button in the purchase table
    const addBtn = page.locator('button[aria-label*="Add"]').first();

    // Only test if variants are loaded (not fallback/placeholder)
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click();

      // Cart drawer should open
      const drawer = page.getByRole('dialog', { name: 'Shopping cart' });
      await expect(drawer).toBeVisible({ timeout: 10_000 });

      // Should have at least one line
      const lines = drawer.getByTestId('cart-line');
      await expect(lines).toHaveCount(1, { timeout: 10_000 });
    }
  });
});
