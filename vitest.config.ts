// vitest.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',

    // Only collect unit tests and RLS tests (and NOTHING in e2e/)
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'supabase/tests/rls/**/*.{test,spec}.ts',
    ],

    // Only exclude the known non-test folders + Playwright outputs
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'e2e/**',
      'tests/**',
    ],
  },
});
