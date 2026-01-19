// vite.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
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
    rollupOptions: {
      output: {
        // Split big deps into separate chunks.
        // This reduces the chance the main chunk crosses 500kb.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('@mui')) return 'mui';
          if (id.includes('@emotion')) return 'emotion';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('react-router')) return 'router';
          if (id.includes('react')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
