import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    host: true,
    port: 5173,
    strictPort: true,
    watch: { usePolling: true },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },

  test: {
    // Prevent Vitest from ever collecting Playwright specs
    exclude: [
      'e2e/**',
      'tests/**', // if you still have a /tests folder with Playwright files
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.e2e.ts',
      '**/*.e2e.tsx',
    ],
  },
});
