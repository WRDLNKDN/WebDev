import type { ChatRoomWithMembers } from '../../hooks/chatTypes';

export type ChatRoomFilter = 'all' | 'favorites' | 'unread' | 'groups' | 'dm';
export type ChatRoomSort = 'recent' | 'favorites' | 'unread' | 'alphabetical';

export const CHAT_ROOM_FILTER_OPTIONS: Array<{
  value: ChatRoomFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'unread', label: 'Unread' },
  { value: 'groups', label: 'Groups' },
  { value: 'dm', label: '1:1' },
];

export const CHAT_ROOM_SORT_OPTIONS: Array<{
  value: ChatRoomSort;
  label: string;
}> = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'favorites', label: 'Favorites First' },
  { value: 'unread', label: 'Unread First' },
  { value: 'alphabetical', label: 'Alphabetical' },
];

export function getChatRoomLabel(
  room: ChatRoomWithMembers,
  currentUserId?: string,
): string {
  if (room.room_type === 'group' && room.name?.trim()) {
    return room.name.trim();
  }

  const otherMember = currentUserId
    ? room.members.find((member) => member.user_id !== currentUserId)
    : (room.members[1] ?? room.members[0]);
  return (
    otherMember?.profile?.display_name?.trim() ||
    otherMember?.profile?.handle?.trim() ||
    'User'
  );
}

function getRecentTimestamp(room: ChatRoomWithMembers): number {
  const value = room.last_message_at || room.updated_at || room.created_at;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareByRecent(
  a: ChatRoomWithMembers,
  b: ChatRoomWithMembers,
): number {
  return getRecentTimestamp(b) - getRecentTimestamp(a);
}

function compareByAlphabetical(
  a: ChatRoomWithMembers,
  b: ChatRoomWithMembers,
  currentUserId?: string,
): number {
  const byLabel = getChatRoomLabel(a, currentUserId).localeCompare(
    getChatRoomLabel(b, currentUserId),
    undefined,
    { sensitivity: 'base' },
  );
  return byLabel || compareByRecent(a, b);
}

export function deriveVisibleChatRooms(
  rooms: ChatRoomWithMembers[],
  options: {
    currentUserId?: string;
    filter: ChatRoomFilter;
    sort: ChatRoomSort;
    searchQuery?: string;
  },
): ChatRoomWithMembers[] {
  const { currentUserId, filter, sort, searchQuery = '' } = options;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filtered = rooms.filter((room) => {
    if (filter === 'favorites' && !room.is_favorite) return false;
    if (filter === 'unread' && (room.unread_count ?? 0) <= 0) return false;
    if (filter === 'groups' && room.room_type !== 'group') return false;
    if (filter === 'dm' && room.room_type !== 'dm') return false;

    if (!normalizedQuery) return true;

    const haystack = [
      getChatRoomLabel(room, currentUserId),
      room.last_message_preview ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  return [...filtered].sort((a, b) => {
    if (sort === 'alphabetical') {
      return compareByAlphabetical(a, b, currentUserId);
    }

    if (sort === 'favorites') {
      const byFavorite =
        Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite));
      return byFavorite || compareByRecent(a, b);
    }

    if (sort === 'unread') {
      const byUnreadFlag =
        Number((b.unread_count ?? 0) > 0) - Number((a.unread_count ?? 0) > 0);
      const byUnreadCount = (b.unread_count ?? 0) - (a.unread_count ?? 0);
      return byUnreadFlag || byUnreadCount || compareByRecent(a, b);
    }

    return compareByRecent(a, b);
  });
}
