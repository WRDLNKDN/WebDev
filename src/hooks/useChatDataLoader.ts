import { startTransition, useCallback, useEffect } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import type { ChatMessage, ChatRoom } from '../types/chat';
import type {
  ChatRoomWithMembers,
  MessageReplyPreview,
  MessageWithExtras,
} from './chatTypes';

const CHAT_MESSAGES_PAGE_SIZE = 60;

type Params = {
  roomId: string | null;
  loadingOlder: boolean;
  oldestLoadedRef: React.MutableRefObject<{
    created_at: string;
    id: string;
  } | null>;
  setRoom: React.Dispatch<React.SetStateAction<ChatRoomWithMembers | null>>;
  setMessages: React.Dispatch<React.SetStateAction<MessageWithExtras[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setHasOlderMessages: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingOlder: React.Dispatch<React.SetStateAction<boolean>>;
};

export const useChatDataLoader = ({
  roomId,
  loadingOlder,
  oldestLoadedRef,
  setRoom,
  setMessages,
  setLoading,
  setError,
  setHasOlderMessages,
  setLoadingOlder,
}: Params) => {
  const fetchRoom = useCallback(
    async (id: string): Promise<boolean> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) {
        setError('This chat could not be found. You may not have access.');
        setRoom(null);
        setMessages([]);
        return false;
      }

      const { data: membershipRow, error: membershipErr } = await supabase
        .from('chat_room_members')
        .select('room_id')
        .eq('room_id', id)
        .eq('user_id', currentUserId)
        .is('left_at', null)
        .maybeSingle();

      if (membershipErr || !membershipRow) {
        setError('This chat could not be found. You may not have access.');
        setRoom(null);
        setMessages([]);
        return false;
      }

      const { data: roomData, error: roomErr } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', id)
        .single();

      if (roomErr || !roomData) {
        setError('This chat could not be found. You may not have access.');
        setRoom(null);
        setMessages([]);
        return false;
      }

      const { data: membersData } = await supabase
        .from('chat_room_members')
        .select('room_id, user_id, role, joined_at, left_at')
        .eq('room_id', id)
        .is('left_at', null);

      const userIds = [
        ...new Set((membersData ?? []).map((member) => member.user_id)),
      ];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar')
        .in('id', userIds);

      const profileMap = new Map(
        (profilesData ?? []).map((profile) => [
          profile.id,
          {
            handle: profile.handle,
            display_name: profile.display_name,
            avatar: profile.avatar,
          },
        ]),
      );

      setError(null);
      setRoom({
        ...(roomData as ChatRoom),
        members: (membersData ?? []).map((member) => ({
          ...member,
          profile: profileMap.get(member.user_id) ?? null,
        })) as ChatRoomWithMembers['members'],
      });
      return true;
    },
    [setError, setMessages, setRoom],
  );

  const enrichMessages = useCallback(async (msgData: ChatMessage[]) => {
    const senderIds = [
      ...new Set(
        msgData
          .map((message) => message.sender_id)
          .filter((id): id is string => id != null),
      ),
    ];

    const { data: senderProfiles } =
      senderIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, handle, display_name, avatar')
            .in('id', senderIds)
        : { data: [] };

    const senderMap = new Map(
      (senderProfiles ?? []).map((profile) => [
        profile.id,
        {
          handle: profile.handle,
          display_name: profile.display_name,
          avatar: profile.avatar,
        },
      ]),
    );

    const replyPreviewById = new Map<string, MessageReplyPreview>();
    const replyToIds = [
      ...new Set(
        msgData
          .map((m) => m.reply_to_message_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (replyToIds.length > 0) {
      const { data: parentRows } = await supabase
        .from('chat_messages')
        .select('*')
        .in('id', replyToIds);
      const parents = parentRows ?? [];
      const replySenderIds = [
        ...new Set(
          parents
            .map((p) => p.sender_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const missingProfileIds = replySenderIds.filter(
        (id) => !senderMap.has(id),
      );
      if (missingProfileIds.length > 0) {
        const { data: moreProfiles } = await supabase
          .from('profiles')
          .select('id, handle, display_name, avatar')
          .in('id', missingProfileIds);
        for (const profile of moreProfiles ?? []) {
          senderMap.set(profile.id, {
            handle: profile.handle,
            display_name: profile.display_name,
            avatar: profile.avatar,
          });
        }
      }
      for (const parent of parents) {
        replyPreviewById.set(parent.id, {
          id: parent.id,
          content: parent.content,
          is_deleted: parent.is_deleted,
          sender_profile: parent.sender_id
            ? (senderMap.get(parent.sender_id) ?? null)
            : null,
        });
      }
    }

    const messageIds = msgData.map((message) => message.id);
    const [reactionsRes, attachmentsRes, receiptsRes] = await Promise.all([
      messageIds.length > 0
        ? supabase
            .from('chat_message_reactions')
            .select('message_id, user_id, emoji')
            .in('message_id', messageIds)
        : { data: [] },
      messageIds.length > 0
        ? supabase
            .from('chat_message_attachments')
            .select('id, message_id, storage_path, mime_type, file_size')
            .in('message_id', messageIds)
        : { data: [] },
      messageIds.length > 0
        ? supabase
            .from('chat_read_receipts')
            .select('message_id, user_id')
            .in('message_id', messageIds)
        : { data: [] },
    ]);

    const reactionsByMessage = (reactionsRes.data ?? []).reduce<
      Record<string, Array<{ user_id: string; emoji: string }>>
    >((acc, reaction) => {
      if (!acc[reaction.message_id]) acc[reaction.message_id] = [];
      acc[reaction.message_id].push({
        user_id: reaction.user_id,
        emoji: reaction.emoji,
      });
      return acc;
    }, {});

    const attachmentsByMessage = (attachmentsRes.data ?? []).reduce<
      Record<
        string,
        Array<{
          id: string;
          storage_path: string;
          mime_type: string;
          file_size: number;
        }>
      >
    >((acc, attachment) => {
      if (!acc[attachment.message_id]) acc[attachment.message_id] = [];
      acc[attachment.message_id].push(attachment);
      return acc;
    }, {});

    const readByMessage = (receiptsRes.data ?? []).reduce<
      Record<string, string[]>
    >((acc, receipt) => {
      if (!acc[receipt.message_id]) acc[receipt.message_id] = [];
      acc[receipt.message_id].push(receipt.user_id);
      return acc;
    }, {});

    return msgData.map((message) => ({
      ...message,
      sender_profile: message.sender_id
        ? (senderMap.get(message.sender_id) ?? null)
        : null,
      reactions: reactionsByMessage[message.id],
      attachments: attachmentsByMessage[message.id],
      read_by: readByMessage[message.id],
      reply_preview: message.reply_to_message_id
        ? (replyPreviewById.get(message.reply_to_message_id) ?? null)
        : null,
    })) as unknown as MessageWithExtras[];
  }, []);

  const fetchMessages = useCallback(
    async (id: string) => {
      const { data: msgData, error: msgErr } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(CHAT_MESSAGES_PAGE_SIZE);

      if (msgErr) {
        setError('Messages could not be loaded. Please try again.');
        setMessages([]);
        setHasOlderMessages(false);
        oldestLoadedRef.current = null;
        return;
      }

      const pageDesc = (msgData ?? []) as ChatMessage[];
      const pageAsc = [...pageDesc].reverse();
      const enriched = await enrichMessages(pageAsc);

      const oldest = pageAsc[0];
      oldestLoadedRef.current = oldest
        ? { created_at: oldest.created_at, id: oldest.id }
        : null;

      startTransition(() => {
        setMessages(enriched);
        setHasOlderMessages(pageDesc.length === CHAT_MESSAGES_PAGE_SIZE);
        setLoading(false);
      });
    },
    [
      enrichMessages,
      oldestLoadedRef,
      setError,
      setHasOlderMessages,
      setLoading,
      setMessages,
    ],
  );

  const loadOlderMessages = useCallback(async () => {
    if (!roomId || loadingOlder || !oldestLoadedRef.current) return;

    setLoadingOlder(true);
    try {
      const cursor = oldestLoadedRef.current;
      const { data: olderRows, error: olderErr } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .lt('created_at', cursor.created_at)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(CHAT_MESSAGES_PAGE_SIZE);

      if (olderErr) {
        setError('Older messages could not be loaded. Please try again.');
        return;
      }

      const olderDesc = (olderRows ?? []) as ChatMessage[];
      if (olderDesc.length === 0) {
        setHasOlderMessages(false);
        return;
      }

      const olderAsc = [...olderDesc].reverse();
      const enrichedOlder = await enrichMessages(olderAsc);
      startTransition(() => {
        setMessages((prev) => [...enrichedOlder, ...prev]);
      });

      const oldest = olderAsc[0];
      oldestLoadedRef.current = oldest
        ? { created_at: oldest.created_at, id: oldest.id }
        : oldestLoadedRef.current;
      setHasOlderMessages(olderDesc.length === CHAT_MESSAGES_PAGE_SIZE);
    } finally {
      setLoadingOlder(false);
    }
  }, [
    enrichMessages,
    loadingOlder,
    oldestLoadedRef,
    roomId,
    setError,
    setHasOlderMessages,
    setLoadingOlder,
    setMessages,
  ]);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setMessages([]);
      setLoading(false);
      setHasOlderMessages(false);
      oldestLoadedRef.current = null;
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const ok = await fetchRoom(roomId);
      if (cancelled) return;
      if (!ok) {
        setLoading(false);
        return;
      }
      await fetchMessages(roomId);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fetchMessages,
    fetchRoom,
    oldestLoadedRef,
    roomId,
    setError,
    setHasOlderMessages,
    setLoading,
    setMessages,
    setRoom,
  ]);

  return { fetchRoom, fetchMessages, loadOlderMessages };
};
