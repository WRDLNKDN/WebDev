import { describe, expect, it } from 'vitest';
import {
  canonicalizeDmRooms,
  getDmParticipantKey,
  pickCanonicalDmRoom,
} from '../../lib/chat/canonicalDm';
import type { ChatRoomWithMembers } from '../../hooks/chatTypes';

function makeDmRoom(
  id: string,
  memberIds: string[],
  overrides: Partial<ChatRoomWithMembers> = {},
): ChatRoomWithMembers {
  return {
    id,
    room_type: 'dm',
    name: null,
    created_by: memberIds[0] ?? 'user-a',
    created_at: '2026-03-10T10:00:00.000Z',
    updated_at: '2026-03-10T10:00:00.000Z',
    members: memberIds.map((userId) => ({
      room_id: id,
      user_id: userId,
      role: userId === memberIds[0] ? 'admin' : 'member',
      joined_at: '2026-03-10T10:00:00.000Z',
      left_at: null,
      profile: null,
    })),
    ...overrides,
  };
}

describe('canonical DM room helpers', () => {
  it('builds a participant key only for valid 1:1 rooms containing the current user', () => {
    expect(
      getDmParticipantKey(makeDmRoom('room-1', ['user-a', 'user-b']), 'user-a'),
    ).toBe('user-a:user-b');
    expect(
      getDmParticipantKey(makeDmRoom('room-2', ['user-b', 'user-c']), 'user-a'),
    ).toBeNull();
    expect(
      getDmParticipantKey(
        makeDmRoom('room-3', ['user-a', 'user-b', 'user-c']),
        'user-a',
      ),
    ).toBeNull();
  });

  it('picks the most recently active DM as the canonical room for a participant pair', () => {
    const older = makeDmRoom('room-older', ['user-a', 'user-b'], {
      last_message_at: '2026-03-10T10:00:00.000Z',
      created_at: '2026-03-10T09:00:00.000Z',
      updated_at: '2026-03-10T10:00:00.000Z',
    });
    const newer = makeDmRoom('room-newer', ['user-a', 'user-b'], {
      last_message_at: '2026-03-11T11:00:00.000Z',
      created_at: '2026-03-11T09:00:00.000Z',
      updated_at: '2026-03-11T11:00:00.000Z',
    });

    expect(pickCanonicalDmRoom([older, newer], 'user-a')?.id).toBe(
      'room-newer',
    );
  });

  it('deduplicates duplicate DM rows while leaving groups and distinct DMs intact', () => {
    const duplicateOlder = makeDmRoom('room-older', ['user-a', 'user-b'], {
      last_message_at: '2026-03-10T10:00:00.000Z',
    });
    const duplicateNewer = makeDmRoom('room-newer', ['user-a', 'user-b'], {
      last_message_at: '2026-03-11T11:00:00.000Z',
    });
    const otherDm = makeDmRoom('room-c', ['user-a', 'user-c'], {
      last_message_at: '2026-03-09T08:00:00.000Z',
    });
    const groupRoom: ChatRoomWithMembers = {
      ...makeDmRoom('group-1', ['user-a', 'user-b']),
      room_type: 'group',
      name: 'Group',
      members: [
        ...makeDmRoom('group-1', ['user-a', 'user-b']).members,
        {
          room_id: 'group-1',
          user_id: 'user-c',
          role: 'member',
          joined_at: '2026-03-10T10:00:00.000Z',
          left_at: null,
          profile: null,
        },
      ],
    };

    expect(
      canonicalizeDmRooms(
        [duplicateOlder, duplicateNewer, otherDm, groupRoom],
        'user-a',
      ).map((room) => room.id),
    ).toEqual(['room-newer', 'room-c', 'group-1']);
  });
});
