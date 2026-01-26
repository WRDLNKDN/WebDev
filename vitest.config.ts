// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,

    // Unit + non-RLS tests only
    include: ['tests/**/*.{test,spec}.ts'],

    // Key fix: do NOT collect RLS tests in normal runs
    exclude: [
      'tests/rls/**',
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
