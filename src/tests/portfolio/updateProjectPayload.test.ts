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
      orderCalls: 0,
      select: vi.fn(function () {
        return builder;
      }),
      eq: vi.fn(function (column: string, value: unknown) {
        if (builder.isUpdateMode) state.updateEqCalls.push([column, value]);
        return builder;
      }),
      order: vi.fn(function () {
        builder.orderCalls += 1;
        if (builder.orderCalls >= 2) {
          return Promise.resolve({ data: [], error: null });
        }
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

describe('useProfile.updateProject payload mapping', () => {
  beforeEach(() => {
    state.capturedUpdatePayload = null;
    state.updateEqCalls = [];
    supabaseMock.from.mockClear();
    supabaseMock.auth.getSession.mockClear();
  });

  it('normalizes Google doc URLs and marks thumbnail pending without manual image', async () => {
    const api = useProfile();

    await api.updateProject('project-1', {
      title: 'Updated Artifact',
      description: 'Updated details',
      image_url: '',
      project_url: ' https://docs.google.com/document/d/abc123/edit#top ',
      tech_stack: ['Data'],
      is_highlighted: true,
    });

    expect(state.updateEqCalls).toEqual([
      ['id', 'project-1'],
      ['owner_id', 'user-1'],
    ]);
    expect(state.capturedUpdatePayload).toMatchObject({
      title: 'Updated Artifact',
      description: 'Updated details',
      project_url: 'https://docs.google.com/document/d/abc123/edit#top',
      image_url: '',
      tech_stack: ['Data'],
      is_highlighted: true,
      normalized_url: 'https://docs.google.com/document/d/abc123/preview#top',
      embed_url: 'https://docs.google.com/document/d/abc123/preview#top',
      resolved_type: 'google_doc',
      thumbnail_status: 'pending',
      thumbnail_url: null,
    });
  });

  it('keeps thumbnail generation disabled when manual image exists', async () => {
    const api = useProfile();

    await api.updateProject('project-1', {
      title: 'Manual Image Artifact',
      description: 'Has manual preview',
      image_url: 'https://cdn.example.com/manual.png',
      project_url: 'https://example.com/artifact.pdf',
      tech_stack: ['Case Study'],
      is_highlighted: false,
    });

    expect(state.capturedUpdatePayload).toMatchObject({
      title: 'Manual Image Artifact',
      description: 'Has manual preview',
      project_url: 'https://example.com/artifact.pdf',
      image_url: 'https://cdn.example.com/manual.png',
      tech_stack: ['Case Study'],
      is_highlighted: false,
      normalized_url: 'https://example.com/artifact.pdf',
      resolved_type: 'pdf',
      thumbnail_status: null,
      thumbnail_url: null,
    });
    expect(
      (state.capturedUpdatePayload as { embed_url?: string }).embed_url,
    ).toBeUndefined();
  });
});
