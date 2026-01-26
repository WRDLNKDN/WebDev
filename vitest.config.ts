// vitest.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: [
      'tests/**/*.{test,tests,spec,specs}.{ts,tsx}',
      'supabase/tests/rls/**/*.{test,tests,spec,specs}.ts',
    ],
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
