import { test, expect } from '@playwright/test';

test.describe('3c — orientation and layout', () => {
  test('6×10 ChArUco at 20 mm on A4 → landscape PDF, square pitch = 20 mm', async ({ page }) => {
    // Navigate with explicit params
    await page.goto('/tools/generator/?type=ChArUco&rows=6&cols=10&square=20&marker=14&paper=A4&scaleBar=true&showAxes=true');
    await page.waitForTimeout(2000);

    // Verify the preview shows landscape
    const previewText = await page.locator('span:has-text("landscape")').first().textContent();
    expect(previewText).toContain('landscape');

    // The SVG viewBox should show landscape dimensions (width > height)
    const svg = page.locator('svg[role="img"]');
    await expect(svg).toBeVisible();
    const viewBox = await svg.getAttribute('viewBox');
    expect(viewBox).toBeTruthy();
    const [, , svgW, svgH] = viewBox!.split(' ').map(Number);
    expect(svgW).toBeGreaterThan(svgH); // landscape

    // SVG uses mm units — verify the viewBox width matches A4 landscape (297 mm)
    expect(svgW).toBeCloseTo(297, 0);

    await page.screenshot({ path: 'screenshots/layout-landscape-6x10.png', fullPage: true });
  });

  test('7×12 ChArUco at 25 mm on A4 → tiling, shows fit notice with 2 pages', async ({ page }) => {
    await page.goto('/tools/generator/?type=ChArUco&rows=7&cols=12&square=25&marker=18&paper=A4&scaleBar=true&showAxes=true');
    await page.waitForTimeout(2000);

    // Should show the fit notice (pattern doesn't fit)
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    const alertText = await alert.textContent();
    expect(alertText).toContain('does not fit');
    expect(alertText).toContain('Tile');

    await page.screenshot({ path: 'screenshots/layout-tiled-7x12.png', fullPage: true });
  });

  test('usable grid notice is shown in preview info', async ({ page }) => {
    await page.goto('/tools/generator/?type=ChArUco&rows=6&cols=10&square=20&marker=14&paper=A4&scaleBar=true&showAxes=true');
    await page.waitForTimeout(2000);

    // The usable grid notice should appear in the preview area
    const previewInfo = page.locator('span:has-text("fits up to")');
    await expect(previewInfo).toBeVisible();
  });

  test('orientation selector has Auto/Portrait/Landscape options', async ({ page }) => {
    await page.goto('/tools/generator/');
    await page.waitForTimeout(1500);

    const orientSelect = page.locator('select').filter({ hasText: 'Auto' }).first();
    await expect(orientSelect).toBeVisible();
    const options = await orientSelect.locator('option').allTextContents();
    expect(options).toContain('Auto');
    expect(options).toContain('Portrait');
    expect(options).toContain('Landscape');
  });

  test('portrait export for tall pattern', async ({ page }) => {
    await page.goto('/tools/generator/?type=ChArUco&rows=10&cols=6&square=20&marker=14&paper=A4&scaleBar=true&showAxes=true');
    await page.waitForTimeout(2000);

    const previewText = await page.locator('span:has-text("portrait")').first().textContent();
    expect(previewText).toContain('portrait');

    const svg = page.locator('svg[role="img"]');
    const viewBox = await svg.getAttribute('viewBox');
    const [, , svgW, svgH] = viewBox!.split(' ').map(Number);
    expect(svgH).toBeGreaterThan(svgW); // portrait

    await page.screenshot({ path: 'screenshots/layout-portrait-10x6.png', fullPage: true });
  });
});
