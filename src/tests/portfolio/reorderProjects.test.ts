import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfile } from '../../hooks/useProfile';

const { supabaseMock, state } = vi.hoisted(() => {
  const state = {
    updateCalls: [] as Array<{
      id: string;
      ownerId: string;
      sortOrder: number;
    }>,
    failForId: null as string | null,
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
      if (table !== 'portfolio_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          order: vi.fn().mockReturnThis(),
        };
      }

      return {
        update: vi.fn((payload: { sort_order: number }) => ({
          eq: vi.fn((column: string, value: unknown) => {
            if (column !== 'id')
              return { eq: vi.fn(async () => ({ error: null })) };
            const id = String(value);
            return {
              eq: vi.fn(async (_ownerColumn: string, ownerValue: unknown) => {
                state.updateCalls.push({
                  id,
                  ownerId: String(ownerValue),
                  sortOrder: payload.sort_order,
                });
                if (state.failForId && state.failForId === id) {
                  return { error: { message: 'db write failed' } };
                }
                return { error: null };
              }),
            };
          }),
        })),
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

  return { supabaseMock, state };
});

vi.mock('react', () => ({
  useState: (initial: unknown) => [initial, vi.fn()],
  useEffect: vi.fn(),
  useCallback: (fn: unknown) => fn,
}));

vi.mock('../../lib/auth/supabaseClient', () => ({
  supabase: supabaseMock,
}));

describe('useProfile.reorderProjects', () => {
  beforeEach(() => {
    state.updateCalls = [];
    state.failForId = null;
    supabaseMock.from.mockClear();
    supabaseMock.auth.getSession.mockClear();
  });

  it('maps ordered IDs to sequential sort_order values', async () => {
    const api = useProfile();

    await api.reorderProjects(['project-3', 'project-1', 'project-2']);

    expect(state.updateCalls).toEqual([
      { id: 'project-3', ownerId: 'user-1', sortOrder: 0 },
      { id: 'project-1', ownerId: 'user-1', sortOrder: 1 },
      { id: 'project-2', ownerId: 'user-1', sortOrder: 2 },
    ]);
  });

  it('throws a clear message when persistence fails', async () => {
    const api = useProfile();
    state.failForId = 'project-2';

    await expect(
      api.reorderProjects(['project-1', 'project-2']),
    ).rejects.toThrow('Could not save artifact order. Please try again.');
  });
});
