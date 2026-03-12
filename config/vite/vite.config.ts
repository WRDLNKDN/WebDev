// vite.config.ts
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';

type ProxyErrorHandler = (
  err: Error,
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
) => void;

type ProxyServerLike = {
  on(event: 'error', listener: ProxyErrorHandler): void;
};

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
            configure: (proxy: ProxyServerLike) => {
              proxy.on(
                'error',
                (
                  _err: Error,
                  _req: IncomingMessage,
                  res: ServerResponse<IncomingMessage>,
                ) => {
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
                },
              );
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
          if (id.includes('emoji-picker-react')) return 'emoji-picker';
          if (id.includes('@dicebear')) return 'dicebear';
          if (id.includes('/uuid/') || id.includes('\\uuid\\')) return 'uuid';
          if (id.includes('@mui')) return 'mui';
          if (id.includes('@emotion')) return 'emotion';
          if (id.includes('@supabase')) return 'supabase';
          if (
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('react-router') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
});
