import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // or 'node' if these are node-only
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
