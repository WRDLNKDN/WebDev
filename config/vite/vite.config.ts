// vite.config.ts
import react from '@vitejs/plugin-react';
import { ServerResponse, type IncomingMessage } from 'node:http';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';

const frontendOnlyE2E = process.env.PLAYWRIGHT_FRONTEND_ONLY === 'true';

const frontendOnlyApiPlugin: Plugin = {
  name: 'playwright-frontend-only-api',
  configureServer(server: ViteDevServer) {
    if (!frontendOnlyE2E) return;

    server.middlewares.use(
      '/api',
      (req: IncomingMessage, res: ServerResponse<IncomingMessage>) => {
        const url = req.url ?? '';

        if (url.startsWith('/me/avatar')) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, data: { avatarUrl: null } }));
          return;
        }

        if (url.startsWith('/auth/callback-log')) {
          if ((req.method ?? 'GET').toUpperCase() === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, data: [] }));
            return;
          }

          res.statusCode = 204;
          res.end();
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 503;
        res.end(
          JSON.stringify({
            error: 'Service unavailable',
            detail: 'Backend disabled for frontend-only Playwright run.',
          }),
        );
      },
    );
  },
};

export default defineConfig({
  plugins: [react(), frontendOnlyApiPlugin],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: { usePolling: true },
    proxy: frontendOnlyE2E
      ? undefined
      : {
          '/api': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: true,
            secure: false,
            configure: (proxy) => {
              proxy.on('error', (_err, _req, res) => {
                // When backend is down, respond 503 instead of leaking ECONNREFUSED to console.
                // `res` is only a ServerResponse for HTTP; WebSocket proxy errors pass a Socket.
                if (res instanceof ServerResponse && !res.headersSent) {
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
    minify: 'esbuild', // Faster than terser, good compression
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    /** Inject modulepreload for dynamic imports where Rollup can resolve deps. */
    modulePreload: { polyfill: true },
    reportCompressedSize: false, // Faster builds
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // Lazy feature libraries: keep them isolated from the app shell.
          if (id.includes('emoji-picker-react')) return 'emoji-picker';
          if (id.includes('@dicebear')) return 'dicebear';
          if (id.includes('@dnd-kit')) return 'dnd-kit';
          if (id.includes('/uuid/') || id.includes('\\uuid\\')) return 'uuid';

          // Group the broader MUI runtime stack together, but keep icons separate.
          if (id.includes('@mui/icons-material')) return 'mui-icons';
          if (
            id.includes('/node_modules/@mui/') ||
            id.includes('\\node_modules\\@mui\\') ||
            id.includes('@emotion') ||
            id.includes('@popperjs') ||
            id.includes('react-transition-group') ||
            id.includes('stylis') ||
            id.includes('clsx') ||
            id.includes('prop-types') ||
            id.includes('@babel/runtime')
          ) {
            return 'mui-core';
          }

          // Data/auth SDK stays stable in its own chunk.
          if (id.includes('@supabase')) return 'supabase';

          // PDF optimization (dynamic import); keep out of the main vendor blob.
          if (id.includes('pdf-lib')) return 'pdf-lib';

          // React + DOM + scheduler: largest share of the old monolithic vendor chunk.
          if (
            id.includes('/node_modules/react/') ||
            id.includes('\\node_modules\\react\\') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('\\node_modules\\react-dom\\') ||
            id.includes('/node_modules/scheduler/') ||
            id.includes('\\node_modules\\scheduler\\')
          ) {
            return 'react-core';
          }

          if (
            id.includes('/node_modules/react-router') ||
            id.includes('\\node_modules\\react-router')
          ) {
            return 'react-router';
          }

          if (id.includes('react-helmet-async')) return 'react-helmet';

          // Keep the remaining third-party code in a generic vendor bucket.
          return 'vendor';
        },
      },
    },
  },
});
