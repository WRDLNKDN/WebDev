import type { MentionableUser } from '../../components/chat/message/MentionAutocomplete';
import type { ChatRoomWithMembers } from '../../hooks/chatTypes';

/**
 * Members eligible for @mention in group chat: must have a non-empty profile handle
 * (matches `notifications_on_chat_mention` and `MessageContent` parsing).
 */
export function roomMembersToMentionable(
  room: ChatRoomWithMembers | null | undefined,
): MentionableUser[] {
  if (!room || room.room_type !== 'group' || !room.members?.length) {
    return [];
  }
  const out: MentionableUser[] = [];
  for (const m of room.members) {
    const h = m.profile?.handle?.trim();
    if (!h) continue;
    out.push({
      user_id: m.user_id,
      handle: h,
      display_name: m.profile?.display_name ?? null,
      avatar: m.profile?.avatar ?? null,
    });
  }
  return out;
}
