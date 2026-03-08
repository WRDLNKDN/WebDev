// vitest.rls.config.ts
import { defineConfig } from 'vitest/config';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

// Load env for tests (supports .env, .env.local, etc)
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), quiet: true });
dotenv.config({
  path: path.resolve(process.cwd(), '.env.test.local'),
  quiet: true,
});

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    maxWorkers: 12,
    minWorkers: 1,

    // Only run RLS tests
    include: ['src/tests/rls/**/*.{test,spec}.ts'],

    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'src/e2e/**',
    ],
  },
});
