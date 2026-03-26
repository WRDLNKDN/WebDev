import { startTransition, useEffect } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import { fetchMessageReplyPreview } from '../lib/chat/replyPreview';
import type { ChatMessage } from '../types/chat';
import type { MessageWithExtras } from './chatTypes';

type Params = {
  roomId: string | null;
  setMessages: React.Dispatch<React.SetStateAction<MessageWithExtras[]>>;
};

export const useChatRealtime = ({ roomId, setMessages }: Params) => {
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newRow = payload.new as ChatMessage;
          setTimeout(() => {
            void (async () => {
              const { data: fullMsg } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('id', newRow.id)
                .single();
              if (!fullMsg) return;

              let senderProfile = null;
              if (fullMsg.sender_id) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('handle, display_name, avatar')
                  .eq('id', fullMsg.sender_id)
                  .maybeSingle();
                senderProfile = profile ?? null;
              }

              const [reactionsRes, attachmentsRes, replyPreview] =
                await Promise.all([
                  supabase
                    .from('chat_message_reactions')
                    .select('message_id, user_id, emoji')
                    .eq('message_id', fullMsg.id),
                  supabase
                    .from('chat_message_attachments')
                    .select(
                      'id, message_id, storage_path, mime_type, file_size',
                    )
                    .eq('message_id', fullMsg.id),
                  fetchMessageReplyPreview(fullMsg.reply_to_message_id),
                ]);

              const next = {
                ...fullMsg,
                sender_profile: senderProfile,
                reactions: reactionsRes.data ?? [],
                attachments: attachmentsRes.data ?? [],
                reply_preview: replyPreview,
              } as unknown as MessageWithExtras;

              startTransition(() => {
                setMessages((prev) =>
                  prev.some((message) => message.id === next.id)
                    ? prev
                    : [...prev, next],
                );
              });
            })();
          }, 0);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          startTransition(() => {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === updated.id
                  ? { ...message, ...updated }
                  : message,
              ),
            );
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, setMessages]);
};
