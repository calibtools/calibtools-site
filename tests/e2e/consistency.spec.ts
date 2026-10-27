import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Certificate page
// ---------------------------------------------------------------------------

test('Certificate page contains "Global ACI"', async ({ page }) => {
  await page.goto('/targets/certificate-ilac/');
  const body = await page.locator('main').textContent();
  expect(body).toContain('Global ACI');
});

test('Certificate page does not contain "DAkkS certificate"', async ({ page }) => {
  await page.goto('/targets/certificate-ilac/');
  const body = await page.locator('main').textContent();
  expect(body?.toLowerCase()).not.toContain('dakks certificate');
});

test('Certificate page contains ISO/IEC 17025', async ({ page }) => {
  await page.goto('/targets/certificate-ilac/');
  const body = await page.locator('main').textContent();
  expect(body).toContain('ISO/IEC 17025');
});

// ---------------------------------------------------------------------------
// Banned phrases in dist (same as check-prose but via rendered HTML)
// ---------------------------------------------------------------------------

test('No "Germany", "Munich", "München", "EU stock" in dist', async ({ page }) => {
  const pages = ['/', '/targets/', '/about/', '/shipping/', '/guides/'];
  for (const path of pages) {
    await page.goto(path);
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body, `"Germany" in ${path}`).not.toMatch(/\bGermany\b/);
    expect(body, `"Munich" in ${path}`).not.toMatch(/\bMunich\b/i);
    expect(body, `"München" in ${path}`).not.toMatch(/München/);
    expect(body, `"EU stock" in ${path}`).not.toMatch(/EU stock/i);
    expect(body, `"ships from Germany" in ${path}`).not.toMatch(/ships?\s+from\s+Germany/i);
  }
});

// ---------------------------------------------------------------------------
// Ceramic accuracy consistency
// ---------------------------------------------------------------------------

test('Ceramic collection page shows ±2 µm, not ±1–2', async ({ page }) => {
  await page.goto('/targets/collection/ceramic-glass/');
  const body = await page.locator('main').textContent();
  expect(body).toContain('±2 µm');
  expect(body).not.toContain('±1–2');
});

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

test('Ceramic product page screenshot 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/targets/charuco-ceramic/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/ceramic-specs-1440.png', fullPage: true });
});

test('Certificate page screenshot 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/targets/certificate-ilac/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/certificate-1440.png', fullPage: true });
});

test('Certificate page screenshot 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/targets/certificate-ilac/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/certificate-390.png', fullPage: true });
});
