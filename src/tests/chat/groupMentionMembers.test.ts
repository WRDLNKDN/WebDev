import { describe, expect, it } from 'vitest';
import { roomMembersToMentionable } from '../../lib/chat/groupMentionMembers';
import type { ChatRoomWithMembers } from '../../hooks/chatTypes';

describe('roomMembersToMentionable', () => {
  it('returns only group members with non-empty handles', () => {
    const room = {
      id: 'r1',
      room_type: 'group' as const,
      name: 'G',
      created_at: '',
      updated_at: '',
      members: [
        {
          room_id: 'r1',
          user_id: 'u1',
          role: 'member' as const,
          joined_at: '',
          left_at: null,
          profile: {
            handle: 'alice',
            display_name: 'Alice',
            avatar: null,
          },
        },
        {
          room_id: 'r1',
          user_id: 'u2',
          role: 'member' as const,
          joined_at: '',
          left_at: null,
          profile: { handle: '   ', display_name: 'Bob', avatar: null },
        },
        {
          room_id: 'r1',
          user_id: 'u3',
          role: 'member' as const,
          joined_at: '',
          left_at: null,
          profile: null,
        },
      ],
    } as unknown as ChatRoomWithMembers;

    const m = roomMembersToMentionable(room);
    expect(m).toHaveLength(1);
    expect(m[0]?.user_id).toBe('u1');
    expect(m[0]?.handle).toBe('alice');
  });

  it('returns empty for DM or null room', () => {
    expect(roomMembersToMentionable(null)).toEqual([]);
    expect(
      roomMembersToMentionable({
        room_type: 'dm',
        members: [],
      } as unknown as ChatRoomWithMembers),
    ).toEqual([]);
  });
});
