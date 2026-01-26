import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'node:path';

// --------------------------------------------------
// Load env vars for tests
// --------------------------------------------------

// 1) Supabase local env (created by `supabase start`)
dotenv.config({
  path: path.resolve(process.cwd(), 'supabase/.env'),
});

// 2) Optional test overrides
dotenv.config({
  path: path.resolve(process.cwd(), '.env.test'),
});

// 3) Fallback to normal .env
dotenv.config();

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,

    // ✅ Ensure env is loaded before any test files execute
    setupFiles: ['vitest.setup.ts'],

    include: [
      'src/**/*.{test,spec}.ts',
      'src/**/*.{test,spec}.tsx',
      'supabase/tests/rls/**/*.{test,spec}.ts',
    ],

    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'tests/**/*.{test,spec}.ts',
      'tests/**/*.{test,spec}.tsx',
      'e2e/**/*.{test,spec}.ts',
      'e2e/**/*.{test,spec}.tsx',
    ],
  },
});
