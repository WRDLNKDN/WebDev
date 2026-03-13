import { startTransition, useCallback } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import { resolveAttachmentMetaForSend } from '../lib/chat/attachmentMeta';
import { normalizeChatAttachmentMime } from '../lib/chat/attachmentValidation';
import { getChatAttachmentProcessingPlan } from '../lib/chat/attachmentProcessing';
import { toMessage } from '../lib/utils/errors';
import type { ChatAttachmentMeta, ChatMessage } from '../types/chat';
import type { ChatRoomWithMembers, MessageWithExtras } from './chatTypes';

const ALLOWED_PROCESSED_CHAT_MEDIA_MIME = new Set(['video/mp4', 'video/webm']);

type Params = {
  roomId: string | null;
  room: ChatRoomWithMembers | null;
  messages: MessageWithExtras[];
  setMessages: React.Dispatch<React.SetStateAction<MessageWithExtras[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSending: React.Dispatch<React.SetStateAction<boolean>>;
  fetchRoom: (id: string) => Promise<boolean>;
  fetchMessages: (id: string) => Promise<void>;
};

export const useChatActions = ({
  roomId,
  room,
  messages,
  setMessages,
  setError,
  setLoading,
  setSending,
  fetchRoom,
  fetchMessages,
}: Params) => {
  const sendMessage = useCallback(
    async (
      content: string,
      attachmentPaths?: string[],
      attachmentMeta?: ChatAttachmentMeta[],
    ) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('You need to sign in to send messages.');
        return;
      }
      if (!roomId) return;
      if (!content.trim() && (!attachmentPaths || attachmentPaths.length === 0))
        return;

      setSending(true);
      setError(null);
      try {
        const { data: msg, error: insertErr } = await supabase
          .from('chat_messages')
          .insert({
            room_id: roomId,
            sender_id: session.user.id,
            content: content.trim() || null,
            is_system_message: false,
            is_deleted: false,
          })
          .select()
          .single();
        if (insertErr) throw insertErr;

        const currentProfile = room?.members?.find(
          (member) => member.user_id === session.user.id,
        )?.profile;
        const optimistic: MessageWithExtras = {
          ...(msg as ChatMessage),
          sender_profile: currentProfile ?? null,
          reactions: [],
          attachments: [],
        };
        startTransition(() => setMessages((prev) => [...prev, optimistic]));

        if (msg && attachmentPaths && attachmentPaths.length > 0) {
          const resolved = resolveAttachmentMetaForSend(
            attachmentPaths,
            attachmentMeta,
          );
          for (let index = 0; index < attachmentPaths.length; index++) {
            const path = attachmentPaths[index];
            const fileName = path.split('/').at(-1) ?? '';
            const { mime, size } = resolved[index];
            const normalizedMime =
              normalizeChatAttachmentMime({
                name: fileName,
                type: mime,
              }) ?? (ALLOWED_PROCESSED_CHAT_MEDIA_MIME.has(mime) ? mime : null);
            if (!normalizedMime) throw new Error('Unsupported attachment type');
            const plan = getChatAttachmentProcessingPlan({
              size,
              type: normalizedMime,
            });
            if (!plan.accepted) throw new Error(plan.reason);

            await supabase.from('chat_message_attachments').insert({
              message_id: msg.id,
              storage_path: path,
              mime_type: normalizedMime,
              file_size: size,
            });
          }
          await fetchMessages(roomId);
        }
      } catch (cause) {
        const message = toMessage(cause);
        startTransition(() => {
          setError(
            message || 'Your message could not be sent. Please try again.',
          );
        });
      } finally {
        startTransition(() => setSending(false));
      }
    },
    [fetchMessages, room?.members, roomId, setError, setMessages, setSending],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId);
      if (error) setError("We couldn't update that message. Please try again.");
    },
    [setError],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          content: null,
          is_deleted: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId);
      if (error) setError("We couldn't delete that message. Please try again.");
    },
    [setError],
  );

  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || !roomId || messageIds.length === 0) return;

      for (const messageId of messageIds) {
        await supabase.from('chat_read_receipts').upsert(
          {
            message_id: messageId,
            user_id: session.user.id,
            read_at: new Date().toISOString(),
          },
          { onConflict: 'message_id,user_id' },
        );
      }
    },
    [roomId],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const existingReactions =
        messages
          .find((message) => message.id === messageId)
          ?.reactions?.filter(
            (reaction) => reaction.user_id === session.user.id,
          ) ?? [];
      const existing = existingReactions.find(
        (reaction) => reaction.emoji === emoji,
      );

      if (existing) {
        await supabase.from('chat_message_reactions').delete().match({
          message_id: messageId,
          user_id: session.user.id,
          emoji,
        });
      } else {
        if (existingReactions.length > 0) {
          await supabase
            .from('chat_message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', session.user.id);
        }
        await supabase.from('chat_message_reactions').insert({
          message_id: messageId,
          user_id: session.user.id,
          emoji,
        });
      }

      if (roomId) await fetchMessages(roomId);
    },
    [fetchMessages, messages, roomId],
  );

  const leaveRoom = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user || !roomId) return;

    await supabase
      .from('chat_room_members')
      .update({ left_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', session.user.id);
  }, [roomId]);

  const renameRoom = useCallback(
    async (newName: string) => {
      if (!roomId) return;
      await supabase
        .from('chat_rooms')
        .update({ name: newName })
        .eq('id', roomId);
      await fetchRoom(roomId);
    },
    [fetchRoom, roomId],
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!roomId) return;
      await supabase
        .from('chat_room_members')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId);
      await fetchRoom(roomId);
      await fetchMessages(roomId);
    },
    [fetchMessages, fetchRoom, roomId],
  );

  const transferAdmin = useCallback(
    async (newAdminUserId: string) => {
      if (!roomId) return;
      await supabase
        .from('chat_room_members')
        .update({ role: 'member' })
        .eq('room_id', roomId);
      await supabase
        .from('chat_room_members')
        .update({ role: 'admin' })
        .eq('room_id', roomId)
        .eq('user_id', newAdminUserId);
      await fetchRoom(roomId);
    },
    [fetchRoom, roomId],
  );

  const inviteMembers = useCallback(
    async (memberIds: string[]) => {
      if (!roomId) return;

      const { data: roomData } = await supabase
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', roomId)
        .is('left_at', null);

      const existing = new Set((roomData ?? []).map((row) => row.user_id));
      const toAdd = memberIds.filter((id) => !existing.has(id));
      if (toAdd.length === 0) return;

      const { count } = await supabase
        .from('chat_room_members')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .is('left_at', null);

      const current = count ?? 0;
      if (current + toAdd.length > 100)
        throw new Error('A group can have up to 100 members.');

      await supabase
        .from('chat_room_members')
        .insert(
          toAdd.map((id) => ({ room_id: roomId, user_id: id, role: 'member' })),
        );
      await fetchRoom(roomId);
    },
    [fetchRoom, roomId],
  );

  const blockUser = useCallback(async (otherUserId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from('chat_blocks').insert({
      blocker_id: session.user.id,
      blocked_user_id: otherUserId,
    });
  }, []);

  const refresh = useCallback(() => {
    if (!roomId) return;
    setError(null);
    setLoading(true);
    void (async () => {
      const ok = await fetchRoom(roomId);
      if (ok) await fetchMessages(roomId);
      else setLoading(false);
    })();
  }, [fetchMessages, fetchRoom, roomId, setError, setLoading]);

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    toggleReaction,
    leaveRoom,
    renameRoom,
    removeMember,
    transferAdmin,
    inviteMembers,
    blockUser,
    refresh,
  };
};
