// vitest.unit.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,

    // Only run real unit tests (none of your RLS suites)
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'e2e/**',
      'tests/**', // <- excludes your current RLS tests entirely
    ],
  },
});
