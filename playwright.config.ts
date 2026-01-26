import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Only run Playwright tests from ./e2e
  testDir: './e2e',

  fullyParallel: true,
  reporter: 'html',
  timeout: 30 * 1000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'npm run vite',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
