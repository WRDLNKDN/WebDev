// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: 30_000,
  expect: { timeout: 15_000 },

  retries: 1,
  workers: isCI ? 2 : 6,

  reporter: isCI
    ? [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']]
    : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  webServer: {
    // CI: Vite only (no backend env). Local: full stack so /api/* works.
    command: isCI ? 'npm run e2e:serve:ci' : 'npm run e2e:serve',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
