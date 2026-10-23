import { test, expect } from '@playwright/test';

/**
 * Set the "Number of boards" input in the generator.
 * Waits for React hydration before interacting.
 */
async function setBoardCount(page: import('@playwright/test').Page, n: number) {
  // Wait for React hydration — the URL effect writes scaleBar=true after reading state
  await expect(page).toHaveURL(/scaleBar=/, { timeout: 10_000 });
  const input = page.locator('label:has-text("Number of boards")').locator('input');
  await input.fill(String(n));
  await input.dispatchEvent('change');
}

test('generator with n=3 shows board table with correct ID ranges', async ({ page }) => {
  await page.goto('/tools/generator/?type=ChArUco&rows=7&cols=10&square=25&marker=18&dict=DICT_6X6_250');
  await expect(page.locator('h1')).toContainText('Pattern generator');

  await setBoardCount(page, 3);

  // Board table should appear with 3 rows
  await expect(page.locator('table tbody tr')).toHaveCount(3, { timeout: 10_000 });

  const rows = page.locator('table tbody tr');
  // Board 1: startId=0, range 0–34
  await expect(rows.nth(0).locator('input[type="number"]')).toHaveValue('0');
  await expect(rows.nth(0)).toContainText('0\u201334');
  // Board 2: startId=35, range 35–69
  await expect(rows.nth(1).locator('input[type="number"]')).toHaveValue('35');
  await expect(rows.nth(1)).toContainText('35\u201369');
  // Board 3: startId=70, range 70–104
  await expect(rows.nth(2).locator('input[type="number"]')).toHaveValue('70');
  await expect(rows.nth(2)).toContainText('70\u2013104');
});

test('generator n=3 export set downloads a zip', async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto('/tools/generator/?type=ChArUco&rows=7&cols=10&square=25&marker=18&dict=DICT_6X6_250');
  await expect(page.locator('h1')).toContainText('Pattern generator');

  await setBoardCount(page, 3);
  await expect(page.locator('table tbody tr')).toHaveCount(3, { timeout: 10_000 });

  // Click export set and capture download
  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
  await page.locator('button', { hasText: /Export set/ }).click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.zip');

  // Verify zip contents
  const path = await download.path();
  expect(path).toBeTruthy();

  const { readFileSync } = await import('node:fs');
  const JSZip = (await import('jszip')).default;
  const buffer = readFileSync(path!);
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.keys(zip.files);

  // 3 PDFs with correct ID filenames
  const pdfs = files.filter(f => f.endsWith('.pdf'));
  expect(pdfs).toHaveLength(3);
  expect(pdfs.some(f => f.includes('id0'))).toBe(true);
  expect(pdfs.some(f => f.includes('id35'))).toBe(true);
  expect(pdfs.some(f => f.includes('id70'))).toBe(true);

  // Manifest with correct structure
  expect(files).toContain('set-manifest.json');
  const manifest = JSON.parse(await zip.file('set-manifest.json')!.async('string'));
  expect(manifest.board_count).toBe(3);
  expect(manifest.boards).toHaveLength(3);
  expect(manifest.boards[0].id_range).toEqual([0, 34]);

  // All PDFs have valid headers
  for (const pdfName of pdfs) {
    const bytes = await zip.file(pdfName)!.async('uint8array');
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  }
});

test('editing board start ID updates the range', async ({ page }) => {
  await page.goto('/tools/generator/?type=ChArUco&rows=7&cols=10&square=25&marker=18&dict=DICT_6X6_250');
  await expect(page.locator('h1')).toContainText('Pattern generator');

  await setBoardCount(page, 2);
  await expect(page.locator('table tbody tr')).toHaveCount(2, { timeout: 10_000 });

  // Edit board 2's start ID
  const board2Input = page.locator('table tbody tr').nth(1).locator('input[type="number"]');
  await board2Input.fill('100');
  await board2Input.dispatchEvent('change');

  // Range should update: 100–134
  await expect(page.locator('table tbody tr').nth(1)).toContainText('100\u2013134', { timeout: 5_000 });
});
