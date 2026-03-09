import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,

    include: [
      'src/tests/**/*.{test,spec}.ts',
      'src/tests/**/*.{test,spec}.tsx',
    ],

    exclude: [
      'src/tests/rls/**',
      'src/tests/e2e/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
});
