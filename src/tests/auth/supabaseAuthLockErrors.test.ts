import { describe, expect, it } from 'vitest';
import { isBenignSupabaseAuthLockContentionError } from '../../lib/auth/supabaseAuthLockErrors';

describe('isBenignSupabaseAuthLockContentionError', () => {
  it('returns true for Supabase auth mutex steal message (UAT-style key)', () => {
    expect(
      isBenignSupabaseAuthLockContentionError(
        new Error(
          'Lock "lock:uat-sb-wrdlnkdn-auth" was released because another request stole it.',
        ),
      ),
    ).toBe(true);
  });

  it('returns true for dev/prod storage key prefixes', () => {
    expect(
      isBenignSupabaseAuthLockContentionError(
        new Error(
          'Lock "lock:dev-sb-wrdlnkdn-auth" was released because another request stole it',
        ),
      ),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(
      isBenignSupabaseAuthLockContentionError(
        new Error('Network request failed'),
      ),
    ).toBe(false);
    expect(isBenignSupabaseAuthLockContentionError(null)).toBe(false);
  });
});
