import type { ChatRoomWithMembers } from '../../hooks/chatTypes';

function toIsoSortValue(value?: string | null) {
  return value && value.trim() ? value : '';
}

function compareCanonicalDmRooms(
  a: ChatRoomWithMembers,
  b: ChatRoomWithMembers,
) {
  const aActivity =
    toIsoSortValue(a.last_message_at) ||
    toIsoSortValue(a.updated_at) ||
    toIsoSortValue(a.created_at);
  const bActivity =
    toIsoSortValue(b.last_message_at) ||
    toIsoSortValue(b.updated_at) ||
    toIsoSortValue(b.created_at);

  if (aActivity !== bActivity) {
    return bActivity.localeCompare(aActivity);
  }

  const aCreated = toIsoSortValue(a.created_at);
  const bCreated = toIsoSortValue(b.created_at);
  if (aCreated !== bCreated) {
    return aCreated.localeCompare(bCreated);
  }

  return a.id.localeCompare(b.id);
}

export function getDmParticipantKey(
  room: Pick<ChatRoomWithMembers, 'room_type' | 'members'>,
  currentUserId: string,
) {
  if (room.room_type !== 'dm') return null;

  const memberIds = Array.from(
    new Set(
      (room.members ?? [])
        .map((member) => member.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );

  if (memberIds.length !== 2 || !memberIds.includes(currentUserId)) {
    return null;
  }

  return memberIds.sort().join(':');
}

export function pickCanonicalDmRoom(
  rooms: ChatRoomWithMembers[],
  currentUserId: string,
) {
  if (rooms.length === 0) return null;

  const validRooms = rooms.filter(
    (room) => getDmParticipantKey(room, currentUserId) !== null,
  );
  if (validRooms.length === 0) return null;

  return [...validRooms].sort(compareCanonicalDmRooms)[0] ?? null;
}

export function canonicalizeDmRooms(
  rooms: ChatRoomWithMembers[],
  currentUserId: string,
) {
  const canonicalByKey = new Map<string, ChatRoomWithMembers>();

  for (const room of rooms) {
    const key = getDmParticipantKey(room, currentUserId);
    if (!key) continue;

    const existing = canonicalByKey.get(key);
    if (!existing || compareCanonicalDmRooms(existing, room) > 0) {
      canonicalByKey.set(key, room);
    }
  }

  const seenKeys = new Set<string>();
  return rooms.filter((room) => {
    const key = getDmParticipantKey(room, currentUserId);
    if (!key) return true;

    const canonical = canonicalByKey.get(key);
    if (!canonical || canonical.id !== room.id || seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}
