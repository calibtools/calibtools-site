import { defineConfig } from '@playwright/test';

/**
 * Screenshot comparison of four pages at two widths against baselines in
 * tests/visual/__screenshots__ (made on the CI machine, so fonts match).
 * Needs ./dist. A difference is reported, it does not fail the build: see ci.yml.
 * New baseline after an intended change: delete the PNG, let CI write it, commit it.
 */
export default defineConfig({
  testDir: 'tests/visual',
  timeout: 60_000,
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  use: { baseURL: 'http://localhost:4398', headless: true, deviceScaleFactor: 1 },
  webServer: { command: 'node scripts/serve-dist.mjs 4398', port: 4398, reuseExistingServer: false, timeout: 20_000 },
  reporter: [['list']],
});
