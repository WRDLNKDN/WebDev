import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/auth/supabaseClient', () => ({
  supabase: {},
}));

import {
  buildJoinIdentityFromSession,
  hydrateJoinStateFromSession,
  isJoinAuthError,
} from '../../context/joinProviderUtils';
import type { JoinState } from '../../types/join';

describe('joinProviderUtils', () => {
  it('builds join identity data from the active session', () => {
    const identity = buildJoinIdentityFromSession({
      user: {
        id: 'user-1',
        email: 'new@user.test',
        app_metadata: { provider: 'azure' },
      },
    });

    expect(identity.provider).toBe('microsoft');
    expect(identity.userId).toBe('user-1');
    expect(identity.email).toBe('new@user.test');
    expect(identity.termsAccepted).toBe(true);
    expect(identity.guidelinesAccepted).toBe(true);
  });

  it('hydrates stale join state with the live session identity before submit', () => {
    const state: JoinState = {
      currentStep: 'profile',
      completedSteps: ['welcome', 'values', 'profile'],
      identity: {
        provider: 'google',
        userId: 'old-user',
        email: 'old@test.dev',
        termsAccepted: true,
        guidelinesAccepted: true,
        policyVersion: 'v2026.02',
        timestamp: '2026-03-01T00:00:00.000Z',
      },
      values: {
        joinReason: ['Build real relationships'],
        participationStyle: ['Observe and learn'],
      },
      profile: {
        displayName: 'April Drake Test',
        marketingOptIn: false,
      },
    };

    const hydrated = hydrateJoinStateFromSession(state, {
      user: {
        id: 'fresh-user',
        email: 'fresh@test.dev',
        identities: [{ provider: 'google' }],
      },
    });

    expect(hydrated.identity?.userId).toBe('fresh-user');
    expect(hydrated.completedSteps).toEqual([
      'welcome',
      'identity',
      'values',
      'profile',
    ]);
  });

  it('recognizes auth-related submit failures that should hand off to sign in', () => {
    expect(
      isJoinAuthError(
        new Error(
          'You must be signed in to submit. Please sign in again and try again.',
        ),
      ),
    ).toBe(true);
    expect(
      isJoinAuthError(new Error('That display name is already taken.')),
    ).toBe(false);
  });
});
