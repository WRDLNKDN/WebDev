import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests', // Where your test files will live
  fullyParallel: true, // Run tests in parallel to avoid "Efficiency Traps"
  reporter: 'html', // Generates a high-integrity visual report
  timeout: 30 * 1000, // 30 seconds per test to avoid "Timeout Pitfalls"
  /* System Integrity: Match your Vite default port */
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry', // Vital for "System Audits" of failed tests
  },

  /* Environment Optimization: Orchestrate the frontend independently */
  webServer: {
    // We target the raw 'vite' script to avoid re-starting Supabase containers
    command: 'npm run vite',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI, // Skips start-up if server is already running
    timeout: 60 * 1000, // Give it a minute for the first 'Hyper-threaded' build
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
