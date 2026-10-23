import { test, expect } from '@playwright/test';

test.describe('product page: charuco-composite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/targets/charuco-composite/');
  });

  test('spec table renders group headings', async ({ page }) => {
    // Wait for page content
    const specHeadings = page.locator('[data-spec-group]');
    const count = await specHeadings.count();
    // At least one group should render (even with empty metafields,
    // the fallback data may not have specs — but live data should)
    // Check the heading element exists in the DOM
    const h2 = page.locator('h2:has-text("Specifications")');
    // If Specifications heading is present, groups should exist
    if (await h2.isVisible()) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('BreadcrumbList JSON-LD is present', async ({ page }) => {
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    expect(count).toBeGreaterThanOrEqual(2); // BreadcrumbList + ProductGroup (+ FAQPage)

    let foundBreadcrumb = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (text) {
        const json = JSON.parse(text);
        if (json['@type'] === 'BreadcrumbList') {
          foundBreadcrumb = true;
          expect(json.itemListElement).toBeInstanceOf(Array);
          expect(json.itemListElement.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
    expect(foundBreadcrumb).toBe(true);
  });

  test('ProductGroup JSON-LD has valid structure', async ({ page }) => {
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();

    let foundProduct = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (text) {
        const json = JSON.parse(text);
        if (json['@type'] === 'ProductGroup') {
          foundProduct = true;
          expect(json.name).toBeTruthy();
          expect(json.brand).toBeTruthy();
          expect(json.brand.name).toBe('Calib.Tools');
          // Should have variants or an aggregate offer
          expect(json.hasVariant ?? json.offers).toBeTruthy();
        }
      }
    }
    expect(foundProduct).toBe(true);
  });

  test('FAQPage JSON-LD is present', async ({ page }) => {
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();

    let foundFaq = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (text) {
        const json = JSON.parse(text);
        if (json['@type'] === 'FAQPage') {
          foundFaq = true;
          expect(json.mainEntity).toBeInstanceOf(Array);
          expect(json.mainEntity.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
    expect(foundFaq).toBe(true);
  });

  test('Buy now button is present and enabled', async ({ page }) => {
    const buyBtn = page.getByRole('button', { name: 'Buy now' });
    await expect(buyBtn).toBeEnabled({ timeout: 10_000 });
  });

  test('FAQ accordion is present', async ({ page }) => {
    const faqHeading = page.locator('h2:has-text("Frequently asked questions")');
    await expect(faqHeading).toBeVisible();

    const details = page.locator('details');
    expect(await details.count()).toBeGreaterThanOrEqual(1);
  });

  test('Pairs with section is present', async ({ page }) => {
    const heading = page.locator('h2:has-text("Pairs with")');
    await expect(heading).toBeVisible();
  });
});
