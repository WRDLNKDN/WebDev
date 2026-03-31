import { supabase } from '../auth/supabaseClient';

/** Message body: optional note + post URL (matches Share-to-Chat dialogs). */
export function buildSharedPostChatContent(
  optionalMessageTrimmed: string,
  postUrl: string,
): string {
  const parts = [optionalMessageTrimmed, postUrl].filter(Boolean);
  return parts.join('\n\n') || postUrl;
}

export async function insertSharedPostChatMessage(params: {
  roomId: string;
  senderId: string;
  content: string;
}): Promise<void> {
  const { roomId, senderId, content } = params;
  await supabase.from('chat_messages').insert({
    room_id: roomId,
    sender_id: senderId,
    content,
    is_system_message: false,
    is_deleted: false,
  });
}
