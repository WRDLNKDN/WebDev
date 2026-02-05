// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: 30_000,
  expect: { timeout: 15_000 },

  // Keep deterministic for now. (You can bump retries/workers later.)
  retries: 1,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: `npm run vite -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    // In CI there is never an existing server, so don't try to reuse.
    // Locally, reuse helps if you already have Vite running.
    reuseExistingServer: process.env.CI ? false : true,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
