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
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            // When backend is down, respond 503 instead of leaking ECONNREFUSED to console
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: 'Service unavailable',
                  detail: 'Backend not running. Start with: npm run api',
                }),
              );
            }
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@mui')) return 'mui';
          if (id.includes('@emotion')) return 'emotion';
          if (id.includes('@supabase')) return 'supabase';
          // Keep react, react-router, and other libs in vendor to avoid circular chunks
          return 'vendor';
        },
      },
    },
  },
});
