import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// npm does not load .env for Playwright; mirror backend/Vitest so SUPABASE_* from
// repo root enable the API webServer when present.
const repoRoot = process.cwd();
dotenv.config({ path: path.join(repoRoot, '.env'), quiet: true });
dotenv.config({
  path: path.join(repoRoot, '.env.local'),
  override: true,
  quiet: true,
});

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const API_URL = 'http://127.0.0.1:3001/api/health';
const isCI = process.env.CI === 'true';
const hasBackendEnv = Boolean(
  process.env.SUPABASE_URL?.trim() &&
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
);
const frontendOnlyE2e =
  process.env.PLAYWRIGHT_FRONTEND_ONLY === '1' ||
  process.env.PLAYWRIGHT_FRONTEND_ONLY === 'true';
/** API webServer when Supabase backend env is set (after loading .env); opt out with PLAYWRIGHT_FRONTEND_ONLY=1. */
const useBackendServer =
  !frontendOnlyE2e &&
  (process.env.PLAYWRIGHT_USE_BACKEND === 'true' || hasBackendEnv);
const frontendCommand = useBackendServer
  ? 'npm run e2e:serve:frontend'
  : 'PLAYWRIGHT_FRONTEND_ONLY=true npm run e2e:serve:frontend';
const canReuseFrontendServer = !isCI && useBackendServer;
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
    ...(useBackendServer
      ? [
          {
            command: 'npm run e2e:serve:backend',
            url: API_URL,
            reuseExistingServer: !isCI,
            timeout: 180_000,
            gracefulShutdown: {
              signal: 'SIGTERM',
              timeout: 5_000,
            },
          },
        ]
      : []),
    {
      command: frontendCommand,
      url: BASE_URL,
      reuseExistingServer: canReuseFrontendServer,
      timeout: 180_000,
      gracefulShutdown: {
        signal: 'SIGTERM',
        timeout: 5_000,
      },
      // Frontend-only runs (no backend env): ensure app has Supabase placeholders
      // so the dev server and app load; specs stub rest/v1 and auth.
      ...(useBackendServer
        ? {}
        : {
            env: {
              ...process.env,
              VITE_SUPABASE_URL:
                process.env.VITE_SUPABASE_URL || 'https://example.supabase.co',
              VITE_SUPABASE_ANON_KEY:
                process.env.VITE_SUPABASE_ANON_KEY || 'dummy-anon-key-for-e2e',
            },
          }),
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
