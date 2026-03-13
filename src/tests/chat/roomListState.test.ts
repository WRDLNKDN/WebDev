import { describe, expect, it } from 'vitest';
import { deriveVisibleChatRooms } from '../../lib/chat/roomListState';
import type { ChatRoomWithMembers } from '../../hooks/chatTypes';

const baseRoom = (
  id: string,
  displayName: string,
  options?: Partial<ChatRoomWithMembers>,
): ChatRoomWithMembers => ({
  id,
  room_type: 'dm',
  name: null,
  created_by: 'user-1',
  created_at: '2026-03-12T10:00:00.000Z',
  updated_at: '2026-03-12T10:00:00.000Z',
  members: [
    {
      room_id: id,
      user_id: 'user-1',
      role: 'member',
      joined_at: '2026-03-12T10:00:00.000Z',
      left_at: null,
      profile: { handle: 'me', display_name: 'Me', avatar: null },
    },
    {
      room_id: id,
      user_id: `${id}-other`,
      role: 'member',
      joined_at: '2026-03-12T10:00:00.000Z',
      left_at: null,
      profile: {
        handle: displayName.toLowerCase(),
        display_name: displayName,
        avatar: null,
      },
    },
  ],
  last_message_preview: '',
  last_message_at: '2026-03-12T10:00:00.000Z',
  unread_count: 0,
  is_favorite: false,
  ...options,
});

describe('deriveVisibleChatRooms', () => {
  it('keeps favorites grouped above non-favorites for recent sort', () => {
    const rooms = [
      baseRoom('room-1', 'Zed', {
        is_favorite: false,
        last_message_at: '2026-03-12T11:00:00.000Z',
      }),
      baseRoom('room-2', 'Amy', {
        is_favorite: true,
        last_message_at: '2026-03-12T09:00:00.000Z',
      }),
    ];

    const result = deriveVisibleChatRooms(rooms, {
      currentUserId: 'user-1',
      filter: 'all',
      sort: 'recent',
    });

    expect(result.map((room) => room.id)).toEqual(['room-2', 'room-1']);
  });

  it('keeps favorites grouped above non-favorites for alphabetical sort', () => {
    const rooms = [
      baseRoom('room-1', 'Aaron', { is_favorite: false }),
      baseRoom('room-2', 'Zelda', { is_favorite: true }),
      baseRoom('room-3', 'Bella', { is_favorite: true }),
    ];

    const result = deriveVisibleChatRooms(rooms, {
      currentUserId: 'user-1',
      filter: 'all',
      sort: 'alphabetical',
    });

    expect(result.map((room) => room.id)).toEqual([
      'room-3',
      'room-2',
      'room-1',
    ]);
  });
});
