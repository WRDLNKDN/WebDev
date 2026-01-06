import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // The @vitejs/plugin-react handles Hot Module Replacement (HMR) and JSX
    // It is configured to use the modern JSX transform (`runtime: 'automatic'`).
    react(),
  ],
  server: {
    // Optional: open the browser automatically on start
    open: true,
    host: true, // Needed for Docker to expose the port
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Necessary if you're on Windows/WSL for file change detection
    },

    // Proxy API calls to the backend so fetch("/api/...") doesn't return index.html
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // TODO: set this to your backend port
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Ensures a clean, optimized production build
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});