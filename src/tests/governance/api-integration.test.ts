/**
 * API integration tests: auth guards and error response shape.
 * Epic: API & Data Layer Governance - QA task
 *
 * Validates:
 * - Unauthenticated requests to protected routes return 401
 * - Error responses follow { status, message, code } format
 * - Health endpoint is public
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (skips if unset)
 */

import { describe, it, expect, beforeAll } from 'vitest';

const hasSupabaseEnv =
  typeof process.env.SUPABASE_URL === 'string' &&
  process.env.SUPABASE_URL.length > 0 &&
  typeof process.env.SUPABASE_SERVICE_ROLE_KEY === 'string';

describe.skipIf(!hasSupabaseEnv)(
  'API integration: auth and error shape',
  () => {
    let request: (
      url: string,
      opts?: { method?: string; headers?: Record<string, string> },
    ) => Promise<{ status: number; body: unknown }>;

    beforeAll(async () => {
      const supertest = await import('supertest');
      const { app } = await import('../../../backend/app');
      request = async (url: string, opts = {}) => {
        const method = (opts.method || 'get').toLowerCase();
        const r =
          method === 'get'
            ? supertest.default(app).get(url)
            : supertest.default(app).post(url);
        if (opts.headers) {
          Object.entries(opts.headers).forEach(([k, v]) => r.set(k, v));
        }
        const res = await r;
        let body: unknown;
        try {
          body = JSON.parse(res.text || '{}');
        } catch {
          body = res.text;
        }
        return { status: res.status, body };
      };
    });

    it('GET /api/health returns 200 without auth', async () => {
      const { status, body } = await request('/api/health');
      expect(status).toBe(200);
      expect((body as { ok?: boolean }).ok).toBe(true);
    });

    it('GET /api/feeds without Authorization returns 401 with standard shape', async () => {
      const { status, body } = await request('/api/feeds');
      expect(status).toBe(401);
      const b = body as { status?: number; message?: string; code?: string };
      expect(b.status).toBe(401);
      expect(typeof b.message).toBe('string');
      expect(b.message?.length).toBeGreaterThan(0);
      expect(b.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/directory without Authorization returns 401 with standard shape', async () => {
      const { status, body } = await request('/api/directory');
      expect(status).toBe(401);
      const b = body as { status?: number; message?: string; code?: string };
      expect(b.status).toBe(401);
      expect(typeof b.message).toBe('string');
      expect(b.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/feeds without Authorization returns 401', async () => {
      const { status, body } = await request('/api/feeds', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(status).toBe(401);
      const b = body as { code?: string };
      expect(b.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/admin/profiles without auth returns 401', async () => {
      const { status } = await request('/api/admin/profiles');
      expect(status).toBe(401);
    });

    it('invalid Bearer token returns 401', async () => {
      const { status, body } = await request('/api/feeds', {
        headers: { Authorization: 'Bearer invalid.jwt.token' },
      });
      expect(status).toBe(401);
      const b = body as { code?: string };
      expect(b.code).toBe('UNAUTHORIZED');
    });
  },
);
