import { supabase } from '../auth/supabaseClient';
import type { MessageReplyPreview } from '../../hooks/chatTypes';

/** Load parent message + sender profile for a reply reference (one id). */
export async function fetchMessageReplyPreview(
  replyToMessageId: string | null | undefined,
): Promise<MessageReplyPreview | null> {
  if (!replyToMessageId) return null;
  const { data: parent } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('id', replyToMessageId)
    .maybeSingle();
  if (!parent) return null;
  let sender_profile: MessageReplyPreview['sender_profile'] = null;
  if (parent.sender_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('handle, display_name, avatar')
      .eq('id', parent.sender_id)
      .maybeSingle();
    if (profile) {
      sender_profile = {
        handle: profile.handle,
        display_name: profile.display_name,
        avatar: profile.avatar,
      };
    }
  }
  return {
    id: parent.id,
    content: parent.content,
    is_deleted: parent.is_deleted,
    sender_profile,
  };
}
