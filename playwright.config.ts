// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './src/tests', // <-- POINT TO THE PARENT: Lets you target e2e OR quarantine via CLI
  timeout: 30_000,
  expect: { timeout: 15_000 },
  outputDir: 'test-results',
  retries: 1,

  // 🚀 THE FIX: Always generate the HTML report so you can see the pictures and video!
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure', // <-- THE FIX: Always keep the trace if it blows up
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  webServer: {
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
