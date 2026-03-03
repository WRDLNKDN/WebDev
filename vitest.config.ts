import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['vitest.setup.ts'],
    include: ['src/tests/**/*.{test,spec}.ts'],
    pool: 'forks',
    maxWorkers: 12,
    minWorkers: 1,
    exclude: [
      'src/tests/rls/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'src/tests/e2e/**',
    ],
  },
});
