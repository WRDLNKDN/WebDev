import { describe, expect, it } from 'vitest';
import { getProfileLink } from '../../lib/directory/profileLink';

describe('getProfileLink (directory 404 fix)', () => {
  it('returns /p/:token when profile_share_token is set', () => {
    expect(
      getProfileLink({
        id: 'uuid',
        handle: 'alice',
        profile_share_token: 'abc123token',
      }),
    ).toBe('/p/abc123token');
    expect(getProfileLink({ id: 'uuid', profile_share_token: 'xyz' })).toBe(
      '/p/xyz',
    );
  });

  it('returns /profile/:handle when no token but handle present', () => {
    expect(getProfileLink({ id: 'uuid', handle: 'bob' })).toBe('/profile/bob');
  });

  it('returns /profile/:id when no token and no handle', () => {
    expect(getProfileLink({ id: 'uuid-123' })).toBe('/profile/uuid-123');
  });

  it('ignores empty string profile_share_token', () => {
    expect(
      getProfileLink({ id: 'uuid', handle: 'alice', profile_share_token: '' }),
    ).toBe('/profile/alice');
  });
});
