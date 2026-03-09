import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = process.env.CI === 'true';
const localWorkers = Number.parseInt(process.env.E2E_WORKERS ?? '14', 10);
const requestedLocalWorkers =
  Number.isFinite(localWorkers) && localWorkers > 0 ? localWorkers : 14;
const cpuSafeMaxWorkers = Math.max(2, os.cpus().length - 1);
const resolvedLocalWorkers = Math.min(requestedLocalWorkers, cpuSafeMaxWorkers);

export default defineConfig({
  testDir: './src/tests/e2e',
  // Keep file-level parallelism via workers, but avoid intra-file contention.
  fullyParallel: false,

  timeout: isCI ? 30_000 : 60_000,
  expect: { timeout: isCI ? 10_000 : 20_000 },

  retries: isCI ? 2 : 1, // 1 local retry for connection/setup flakiness
  workers: isCI ? 1 : resolvedLocalWorkers,

  forbidOnly: isCI, // catches accidental test.only in PRs

  reporter: isCI
    ? [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']]
    : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: isCI ? 'retain-on-failure' : 'off', // video pipeline has overhead locally
    screenshot: 'only-on-failure',
    actionTimeout: isCI ? 8_000 : 15_000,
    navigationTimeout: isCI ? 30_000 : 60_000,
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
        actionTimeout: 20_000,
        navigationTimeout: 60_000,
        expect: { timeout: 20_000 },
      },
      timeout: 90_000,
    },
  ],
});
