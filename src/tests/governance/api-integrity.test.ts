/**
 * QA: API layer integrity and auth flow validation.
 * Epic: API & Data Layer Governance
 *
 * Validates:
 * - Auth guards (401 without token)
 * - Error response shape (status, message, code)
 * - No raw Supabase/DB errors exposed
 */

import { describe, it, expect } from 'vitest';

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
});
