import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();
const mockRpc = vi.fn();

vi.mock('../../lib/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { loadEligibleChatConnections } from '../../lib/chat/loadEligibleChatConnections';

describe('loadEligibleChatConnections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns [] when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(loadEligibleChatConnections('any-id')).resolves.toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns [] when session user id does not match argument', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-a' } } },
    });
    await expect(loadEligibleChatConnections('user-b')).resolves.toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls chat_list_eligible_connection_profiles and maps rows', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'peer-1',
          handle: 'alex',
          display_name: 'Alex',
          avatar: null,
          email: 'alex@example.com',
        },
      ],
      error: null,
    });

    const out = await loadEligibleChatConnections('user-1');

    expect(mockRpc).toHaveBeenCalledWith(
      'chat_list_eligible_connection_profiles',
    );
    expect(out).toEqual([
      {
        id: 'peer-1',
        handle: 'alex',
        display_name: 'Alex',
        avatar: null,
        email: 'alex@example.com',
      },
    ]);
  });

  it('uses undefined email when RPC returns null email', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'peer-1',
          handle: 'alex',
          display_name: 'Alex',
          avatar: null,
          email: null,
        },
      ],
      error: null,
    });

    const out = await loadEligibleChatConnections('user-1');
    expect(out[0]?.email).toBeUndefined();
  });

  it('throws when RPC returns an error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    const err = { message: 'permission denied', code: '42501' };
    mockRpc.mockResolvedValue({ data: null, error: err });

    await expect(loadEligibleChatConnections('user-1')).rejects.toEqual(err);
  });
});
