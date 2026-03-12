import { describe, expect, it } from 'vitest';
import { resolveChatDocumentTitle } from '../../lib/chat/documentTitle';
import type { ChatRoomWithMembers } from '../../hooks/chatTypes';

function makeRoom(
  overrides: Partial<ChatRoomWithMembers> = {},
): ChatRoomWithMembers {
  return {
    id: 'room-1',
    room_type: 'dm',
    name: null,
    created_by: 'user-a',
    created_at: '2026-03-12T00:00:00.000Z',
    updated_at: '2026-03-12T00:00:00.000Z',
    members: [
      {
        room_id: 'room-1',
        user_id: 'user-a',
        role: 'member',
        joined_at: '2026-03-12T00:00:00.000Z',
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
        joined_at: '2026-03-12T00:00:00.000Z',
        left_at: null,
        profile: {
          handle: 'april',
          display_name: 'April Drake',
          avatar: null,
        },
      },
    ],
    ...overrides,
  };
}

describe('resolveChatDocumentTitle', () => {
  it('returns a generic chat title when no room is loaded', () => {
    expect(resolveChatDocumentTitle(null, 'user-a')).toBe('Chat | WRDLNKDN');
  });

  it('uses the active dm participant name', () => {
    expect(resolveChatDocumentTitle(makeRoom(), 'user-a', 'room-1')).toBe(
      'April Drake | WRDLNKDN',
    );
  });

  it('falls back to the other member handle for dm titles', () => {
    const room = makeRoom({
      members: [
        makeRoom().members[0],
        {
          ...makeRoom().members[1],
          profile: {
            handle: 'april-handle',
            display_name: null,
            avatar: null,
          },
        },
      ],
    });

    expect(resolveChatDocumentTitle(room, 'user-a', 'room-1')).toBe(
      'april-handle | WRDLNKDN',
    );
  });

  it('uses the group name for group chats', () => {
    const room = makeRoom({
      room_type: 'group',
      name: 'Superhumans Beta Club',
    });

    expect(resolveChatDocumentTitle(room, 'user-a', 'room-1')).toBe(
      'Superhumans Beta Club | WRDLNKDN',
    );
  });

  it('falls back to the default title when the loaded room is stale', () => {
    expect(resolveChatDocumentTitle(makeRoom(), 'user-a', 'room-2')).toBe(
      'Chat | WRDLNKDN',
    );
  });
});
