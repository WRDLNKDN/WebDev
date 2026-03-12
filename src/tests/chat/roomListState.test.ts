import { describe, expect, it } from 'vitest';
import {
  deriveVisibleChatRooms,
  getChatRoomLabel,
} from '../../lib/chat/roomListState';
import type { ChatRoomWithMembers } from '../../hooks/chatTypes';

function makeRoom(
  overrides: Partial<ChatRoomWithMembers> = {},
): ChatRoomWithMembers {
  return {
    id: 'room-1',
    room_type: 'dm',
    name: null,
    created_by: 'user-a',
    created_at: '2026-03-10T00:00:00.000Z',
    updated_at: '2026-03-10T00:00:00.000Z',
    members: [
      {
        room_id: 'room-1',
        user_id: 'user-a',
        role: 'member',
        joined_at: '2026-03-10T00:00:00.000Z',
        left_at: null,
        profile: {
          handle: 'self',
          display_name: 'Self User',
          avatar: null,
        },
      },
      {
        room_id: 'room-1',
        user_id: 'user-b',
        role: 'member',
        joined_at: '2026-03-10T00:00:00.000Z',
        left_at: null,
        profile: {
          handle: 'other',
          display_name: 'Other User',
          avatar: null,
        },
      },
    ],
    last_message_preview: 'Hello there',
    last_message_at: '2026-03-10T10:00:00.000Z',
    unread_count: 0,
    is_favorite: false,
    ...overrides,
  };
}

describe('getChatRoomLabel', () => {
  it('uses the group name when present', () => {
    expect(
      getChatRoomLabel(
        makeRoom({ room_type: 'group', name: 'Alpha Group' }),
        'user-a',
      ),
    ).toBe('Alpha Group');
  });
});

describe('deriveVisibleChatRooms', () => {
  const currentUserId = 'user-a';
  const rooms = [
    makeRoom({
      id: 'room-z',
      members: [
        makeRoom().members[0],
        { ...makeRoom().members[1], room_id: 'room-z' },
      ],
      last_message_at: '2026-03-12T10:00:00.000Z',
      is_favorite: false,
    }),
    makeRoom({
      id: 'room-a',
      last_message_at: '2026-03-11T10:00:00.000Z',
      is_favorite: true,
      members: [
        makeRoom().members[0],
        {
          ...makeRoom().members[1],
          room_id: 'room-a',
          profile: {
            handle: 'april',
            display_name: 'April',
            avatar: null,
          },
        },
      ],
    }),
    makeRoom({
      id: 'room-g',
      room_type: 'group',
      name: 'Beta Crew',
      last_message_at: '2026-03-09T10:00:00.000Z',
      unread_count: 4,
      is_favorite: true,
    }),
  ];

  it('filters to favorites only', () => {
    expect(
      deriveVisibleChatRooms(rooms, {
        currentUserId,
        filter: 'favorites',
        sort: 'recent',
      }).map((room) => room.id),
    ).toEqual(['room-a', 'room-g']);
  });

  it('sorts favorites before non-favorites', () => {
    expect(
      deriveVisibleChatRooms(rooms, {
        currentUserId,
        filter: 'all',
        sort: 'favorites',
      }).map((room) => room.id),
    ).toEqual(['room-a', 'room-g', 'room-z']);
  });

  it('sorts unread rooms before read rooms', () => {
    expect(
      deriveVisibleChatRooms(rooms, {
        currentUserId,
        filter: 'all',
        sort: 'unread',
      }).map((room) => room.id),
    ).toEqual(['room-g', 'room-z', 'room-a']);
  });

  it('supports alphabetical labels and search', () => {
    expect(
      deriveVisibleChatRooms(rooms, {
        currentUserId,
        filter: 'all',
        sort: 'alphabetical',
        searchQuery: 'beta',
      }).map((room) => room.id),
    ).toEqual(['room-g']);
  });
});
