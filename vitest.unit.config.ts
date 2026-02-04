import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // or 'node' if these are node-only
    globals: true,

    include: ['tests/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.tsx'],

    exclude: [
      'tests/rls/**',
      'e2e/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
});
