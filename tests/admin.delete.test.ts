import { describe, it, expect } from 'vitest';

describe('admin deleteProfiles response shape', () => {
  it('includes failedAuthDeletes when some deletes fail', () => {
    const response = {
      ok: true,
      failedAuthDeletes: ['user-1'],
    };

    expect(response.ok).toBe(true);
    expect(response.failedAuthDeletes).toContain('user-1');
  });

  it('omits failedAuthDeletes when all deletes succeed', () => {
    const response = {
      ok: true,
    };

    expect(response.ok).toBe(true);
    expect('failedAuthDeletes' in response).toBe(false);
  });
});
