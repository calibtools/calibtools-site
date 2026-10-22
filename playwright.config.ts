import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4321',
    headless: true,
  },
  webServer: {
    command: 'pnpm dev',
    port: 4321,
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
