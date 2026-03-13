import type { ChatRoomWithMembers } from '../../hooks/chatTypes';
import { getDmParticipantKey, pickCanonicalDmRoom } from './canonicalDm';

export function findCanonicalDmRoom(
  rooms: ChatRoomWithMembers[],
  currentUserId: string,
  otherUserId: string,
) {
  const targetKey = [currentUserId, otherUserId].sort().join(':');
  const candidateRooms = rooms.filter(
    (room) => getDmParticipantKey(room, currentUserId) === targetKey,
  );

  return pickCanonicalDmRoom(candidateRooms, currentUserId);
}
