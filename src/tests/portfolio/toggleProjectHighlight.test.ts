import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfile } from '../../hooks/useProfile';

const { state, supabaseMock } = vi.hoisted(() => {
  const state = {
    capturedUpdatePayload: null as Record<string, unknown> | null,
    updateEqCalls: [] as Array<[string, unknown]>,
  };

  const makeProfilesBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({
      data: {
        id: 'user-1',
        handle: 'member',
        display_name: 'Member',
        status: 'approved',
        nerd_creds: {},
        socials: [],
      },
      error: null,
    })),
  });

  const makePortfolioBuilder = () => {
    const builder = {
      isUpdateMode: false,
      select: vi.fn(function () {
        return builder;
      }),
      eq: vi.fn(function (column: string, value: unknown) {
        if (builder.isUpdateMode) state.updateEqCalls.push([column, value]);
        return builder;
      }),
      update: vi.fn(function (payload: Record<string, unknown>) {
        builder.isUpdateMode = true;
        state.capturedUpdatePayload = payload;
        return builder;
      }),
      single: vi.fn(async () => ({
        data: {
          id: 'project-1',
          owner_id: 'user-1',
          ...(state.capturedUpdatePayload ?? {}),
        },
        error: null,
      })),
      order: vi.fn().mockReturnThis(),
    };
    return builder;
  };

  const supabaseMock = {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            user: {
              id: 'user-1',
              email: 'member@example.com',
              user_metadata: {},
            },
          },
        },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') return makeProfilesBuilder();
      if (table === 'portfolio_items') return makePortfolioBuilder();
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
    rpc: vi.fn(async () => ({ data: null, error: null })),
  };

  return { state, supabaseMock };
});

vi.mock('react', () => ({
  useState: (initial: unknown) => [initial, vi.fn()],
  useEffect: vi.fn(),
  useCallback: (fn: unknown) => fn,
}));

vi.mock('../../lib/auth/supabaseClient', () => ({
  supabase: supabaseMock,
}));

describe('useProfile.toggleProjectHighlight', () => {
  beforeEach(() => {
    state.capturedUpdatePayload = null;
    state.updateEqCalls = [];
    supabaseMock.from.mockClear();
    supabaseMock.auth.getSession.mockClear();
  });

  it('saves highlight status for the current owner artifact', async () => {
    const api = useProfile();

    await api.toggleProjectHighlight('project-1', true);

    expect(state.updateEqCalls).toEqual([
      ['id', 'project-1'],
      ['owner_id', 'user-1'],
    ]);
    expect(state.capturedUpdatePayload).toEqual({
      is_highlighted: true,
    });
  });
});
