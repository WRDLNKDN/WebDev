import type { ChatRoomType } from '../../types/chat';

type RoomLike = { room_type: ChatRoomType } | null | undefined;
type OtherLike =
  | {
      user_id: string;
      profile?: { avatar?: string | null } | null;
    }
  | undefined;

/** Props for ChatThreadMessageList DM typing indicator (shared popout / popover / page). */
export function dmTypingThreadProps(
  room: RoomLike,
  otherMember: OtherLike,
  typingUsers: Set<string>,
): {
  typingAvatarUrl?: string | null;
  showTyping?: boolean;
} {
  if (room?.room_type !== 'dm') {
    return {};
  }
  const uid = otherMember?.user_id;
  return {
    typingAvatarUrl: otherMember?.profile?.avatar ?? null,
    showTyping: !!(uid && typingUsers.has(uid)),
  };
}
