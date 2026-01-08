import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // The @vitejs/plugin-react handles Hot Module Replacement (HMR) and JSX.
    // It is configured to use the modern JSX transform.
    react(),
  ],
  server: {
    // If true, Vite may reuse an existing tab (including one on /admin).
    // Use `false` to prevent auto-opening, or `'/'` to always open the homepage.
    open: false,

    host: true,
    port: 5173,
    strictPort: true,

    // Necessary in some environments (WSL/Docker/network filesystems)
    watch: { usePolling: true },

    // Proxy API calls to your backend so the frontend can call /api/*
    // without hardcoding localhost:3001 everywhere.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Ensures a clean, optimized production build
    outDir: 'dist',
    sourcemap: false,
  },
});