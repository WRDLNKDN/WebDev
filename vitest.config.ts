// vitest.config.ts
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'node:path';

// Load env vars for tests (order matters)
dotenv.config({ path: path.resolve(process.cwd(), 'supabase/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
dotenv.config(); // fallback .env

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['vitest.setup.ts'],

    // ✅ Collect tests from /tests (your real location)
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],

    // ✅ Keep exclusions tight, do NOT exclude `tests/**`
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'e2e/**',
    ],
  },
});
