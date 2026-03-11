import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const API_URL = 'http://127.0.0.1:3001/api/health';
const isCI = process.env.CI === 'true';
const LOCAL_WORKERS = 2;
const CI_WORKERS = Number(process.env.PLAYWRIGHT_CI_WORKERS || '1');

export default defineConfig({
  testDir: '../../src/tests/e2e',
  fullyParallel: !isCI, // CI stability over speed; local stays parallel

  timeout: 30_000, // fail faster on genuinely broken tests
  expect: { timeout: 10_000 },

  retries: isCI ? 2 : 1, // 1 local retry for connection/setup flakiness
  workers: isCI ? CI_WORKERS : LOCAL_WORKERS,

  forbidOnly: isCI, // catches accidental test.only in PRs

  reporter: isCI
    ? [
        ['html', { open: 'never', outputFolder: '../../playwright-report' }],
        ['list'],
      ]
    : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: isCI ? 'retain-on-failure' : 'off', // video pipeline has overhead locally
    screenshot: 'only-on-failure',
    actionTimeout: 8_000,
    navigationTimeout: 30_000,
  },

  webServer: [
    {
      command: 'npm run e2e:serve:backend',
      url: API_URL,
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
    {
      command: 'npm run e2e:serve:frontend',
      url: BASE_URL,
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        actionTimeout: 20_000,
        navigationTimeout: 60_000,
        expect: { timeout: 20_000 },
      },
      timeout: 90_000,
    },
    {
      name: 'msedge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        actionTimeout: 20_000,
        navigationTimeout: 60_000,
      },
      timeout: 90_000,
    },
  ],
});
