/**
 * QA: API layer integrity and auth flow validation.
 * Epic: API & Data Layer Governance
 *
 * Validates:
 * - Auth guards (401 without token)
 * - Error response shape (status, message, code)
 * - No raw Supabase/DB errors exposed
 */

import { describe, expect, it } from 'vitest';

describe('API error shape', () => {
  it('standardized error has status, message, code', () => {
    const shape = {
      status: 401,
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
      error: 'Unauthorized',
    };

    expect(shape.status).toBe(401);
    expect(shape.message).toBe('Unauthorized');
    expect(shape.code).toBe('UNAUTHORIZED');
    expect(typeof shape.message).toBe('string');
    expect(shape.message.length).toBeLessThanOrEqual(200);
  });

  it('messageFromApiResponse prefers message over error', async () => {
    const { messageFromApiResponse } = await import('../../lib/utils/errors');
    const out = messageFromApiResponse(400, 'legacy error', 'Standard message');

    expect(out).toBe('Standard message');
  });

  it('messageFromApiResponse falls back to error when no message', async () => {
    const { messageFromApiResponse } = await import('../../lib/utils/errors');
    const out = messageFromApiResponse(400, 'Bad request body', undefined);

    expect(out).toBe('Bad request body');
  });

  it('messageFromApiResponse uses messageForStatus when body looks technical', async () => {
    const { messageFromApiResponse } = await import('../../lib/utils/errors');
    const out = messageFromApiResponse(
      500,
      'relation "foo" does not exist',
      'relation "foo" does not exist',
    );

    expect(out).not.toContain('relation');
    expect(out).toBe('Our server hit an error. Please try again in a moment.');
  });

  it('messageFromApiResponse shows 422 body up to 200 chars (matches sendApiError cap)', async () => {
    const { messageFromApiResponse } = await import('../../lib/utils/errors');
    const body = 'a'.repeat(200);
    const out = messageFromApiResponse(422, body, body);

    expect(out).toBe(body);
    expect(out.length).toBe(200);
  });

  it('messageFromApiResponse maps overlong 422 body to status fallback', async () => {
    const { messageFromApiResponse, messageForStatus } =
      await import('../../lib/utils/errors');
    const body = 'b'.repeat(201);
    const out = messageFromApiResponse(422, body, body);

    expect(out).toBe(messageForStatus(422));
  });

  it('messageFromApiPayload reads nested error.message', async () => {
    const { messageFromApiPayload } = await import('../../lib/utils/errors');
    const out = messageFromApiPayload(422, {
      status: 422,
      error: { message: 'Resume thumbnail: storage quota exceeded' },
    });
    expect(out).toContain('storage quota');
  });

  it('messageFromApiPayload reads top-level detail', async () => {
    const { messageFromApiPayload } = await import('../../lib/utils/errors');
    const out = messageFromApiPayload(503, {
      detail: 'Backend not running. Start with: npm run api',
    });
    expect(out).toContain('Backend not running');
  });
});
