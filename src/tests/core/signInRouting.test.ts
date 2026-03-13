import { describe, expect, it } from 'vitest';
import {
  getJoinSubmitAuthRedirect,
  getSignInPostAuthPath,
} from '../../lib/auth/signInRouting';

describe('signInRouting', () => {
  it('uses the requested in-app next path when present', () => {
    const params = new URLSearchParams('next=%2Fjoin');
    expect(getSignInPostAuthPath(params, '/feed')).toBe('/join');
  });

  it('falls back when next is missing or external', () => {
    expect(getSignInPostAuthPath(new URLSearchParams(), '/feed')).toBe('/feed');
    expect(
      getSignInPostAuthPath(
        new URLSearchParams('next=https://example.com/outside'),
        '/feed',
      ),
    ).toBe('/feed');
  });

  it('routes join submit auth handoff back to join', () => {
    expect(getJoinSubmitAuthRedirect()).toBe('/signin?next=%2Fjoin');
  });
});
