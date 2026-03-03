import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: true, // run tests within a file in parallel, not just files

  timeout: 30_000, // fail faster on genuinely broken tests
  expect: { timeout: 10_000 },

  retries: isCI ? 2 : 0, // no local retries; instant feedback
  workers: 12,

  forbidOnly: isCI, // catches accidental test.only in PRs

  reporter: isCI
    ? [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']]
    : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: isCI ? 'retain-on-failure' : 'off', // video pipeline has overhead locally
    screenshot: 'only-on-failure',
    actionTimeout: 8_000,
    navigationTimeout: 30_000,
  },

  webServer: {
    command: isCI ? 'npm run e2e:serve:ci' : 'npm run e2e:serve',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        actionTimeout: 15_000,
        navigationTimeout: 45_000,
      },
      timeout: 45_000,
    },
  ],
});
