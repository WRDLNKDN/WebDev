import type { Session } from '@supabase/supabase-js';

type MessengerLike = {
  popoverRoomId?: string | null;
} | null;

export function shouldShowChatPopover(
  showMessengerUi: boolean,
  session: Session | null,
  messenger: MessengerLike,
): boolean {
  return Boolean(showMessengerUi && session?.user && messenger?.popoverRoomId);
}

export function shouldShowDockedFooter(
  isJoin: boolean,
  isAdmin: boolean,
  hideFooterForDockedChat: boolean,
): boolean {
  return !isJoin && !isAdmin && !hideFooterForDockedChat;
}
