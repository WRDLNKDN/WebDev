import type { ChatRoomWithMembers } from '../../hooks/chatTypes';

const APP_NAME = 'WRDLNKDN';
const DEFAULT_CHAT_TITLE = `Chat | ${APP_NAME}`;

function getRoomLabel(
  room: ChatRoomWithMembers | null,
  currentUserId?: string,
): string | null {
  if (!room) return null;

  if (room.room_type === 'group') {
    return room.name?.trim() || 'Group chat';
  }

  const otherMember = room.members.find(
    (member) => member.user_id !== currentUserId,
  );
  const label =
    otherMember?.profile?.display_name?.trim() ||
    otherMember?.profile?.handle?.trim() ||
    null;

  return label || 'Chat';
}

export function resolveChatDocumentTitle(
  room: ChatRoomWithMembers | null,
  currentUserId?: string,
  activeRoomId?: string | null,
): string {
  if (activeRoomId && room?.id !== activeRoomId) {
    return DEFAULT_CHAT_TITLE;
  }

  const label = getRoomLabel(room, currentUserId);
  return label ? `${label} | ${APP_NAME}` : DEFAULT_CHAT_TITLE;
}

export function getDefaultChatDocumentTitle(): string {
  return DEFAULT_CHAT_TITLE;
}
