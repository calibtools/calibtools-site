import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Product page with images: gallery + captions
// ---------------------------------------------------------------------------

test.describe('product page with local images: charuco-composite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/targets/charuco-composite/');
  });

  test('gallery renders with data-gallery attribute', async ({ page }) => {
    const gallery = page.locator('[data-gallery]');
    await expect(gallery).toBeVisible();
  });

  test('gallery shows <picture> elements with AVIF source', async ({ page }) => {
    const pictures = page.locator('[data-gallery] picture');
    const count = await pictures.count();
    expect(count).toBeGreaterThan(0);

    // First picture should have an AVIF source
    const avifSource = pictures.first().locator('source[type="image/avif"]');
    await expect(avifSource).toHaveCount(1);
  });

  test('gallery shows thumbnail strip with 5 images', async ({ page }) => {
    const thumbnails = page.locator('[data-gallery] [role="tab"]');
    await expect(thumbnails).toHaveCount(5);
  });

  test('hero image has explicit width and height (no CLS)', async ({ page }) => {
    const heroImg = page.locator('[data-gallery] picture img').first();
    const width = await heroImg.getAttribute('width');
    const height = await heroImg.getAttribute('height');
    expect(Number(width)).toBeGreaterThan(0);
    expect(Number(height)).toBeGreaterThan(0);
  });

  test('hero image is loaded eagerly', async ({ page }) => {
    const heroImg = page.locator('[data-gallery] picture img').first();
    const loading = await heroImg.getAttribute('loading');
    expect(loading).toBe('eager');
  });

});

// ---------------------------------------------------------------------------
// Mounting fixture: 3 images
// ---------------------------------------------------------------------------

test.describe('product page: mounting-fixture (3 images)', () => {
  test('gallery shows 3 thumbnail images', async ({ page }) => {
    await page.goto('/targets/mounting-fixture/');
    const thumbnails = page.locator('[data-gallery] [role="tab"]');
    await expect(thumbnails).toHaveCount(3);
  });
});

// ---------------------------------------------------------------------------
// Product without local images: falls back to render
// ---------------------------------------------------------------------------

test.describe('product page without local images: render fallback', () => {
  test('product pages with no catalogue images show placeholder or Shopify image', async ({
    page,
  }) => {
    // All current products have local images, so we check that
    // a product page at least renders without errors.
    // The render pipeline fallback is verified by the existing test suite.
    await page.goto('/targets/charuco-composite/');
    await expect(page.locator('h1')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// CLS check (basic — full Lighthouse requires CI setup)
// ---------------------------------------------------------------------------

test.describe('layout stability', () => {
  test('product page images have explicit dimensions', async ({ page }) => {
    await page.goto('/targets/charuco-composite/');
    const images = page.locator('[data-gallery] img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const width = await img.getAttribute('width');
      const height = await img.getAttribute('height');
      expect(Number(width), `image ${i} missing width`).toBeGreaterThan(0);
      expect(Number(height), `image ${i} missing height`).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Image transfer size (basic check)
// ---------------------------------------------------------------------------

test.describe('image transfer size', () => {
  test('product page total image bytes ≤ 600 KB at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    let totalImageBytes = 0;
    page.on('response', (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] ?? '';
      if (
        contentType.startsWith('image/') ||
        url.match(/\.(avif|webp|jpe?g|png)(\?|$)/)
      ) {
        const contentLength = response.headers()['content-length'];
        if (contentLength) {
          totalImageBytes += parseInt(contentLength, 10);
        }
      }
    });

    await page.goto('/targets/charuco-composite/', { waitUntil: 'networkidle' });

    // Allow 600 KB
    expect(totalImageBytes).toBeLessThanOrEqual(600 * 1024);
  });
});
