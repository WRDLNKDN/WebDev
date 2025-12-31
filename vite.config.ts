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
  },
  build: {
    // Ensures a clean, optimized production build
    outDir: 'dist',
    sourcemap: false,
  },
});
