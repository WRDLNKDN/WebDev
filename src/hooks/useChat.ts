import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import { normalizeChatAttachmentMime } from '../lib/chat/attachmentValidation';
import { toMessage } from '../lib/utils/errors';
import type {
  ChatMessage,
  ChatMessageAttachment,
  ChatMessageReaction,
  ChatReportCategory,
  ChatRoom,
  ChatRoomMember,
} from '../types/chat';
import { CHAT_MAX_FILE_BYTES } from '../types/chat';

const CHAT_MESSAGES_PAGE_SIZE = 60;

export type ChatRoomWithMembers = ChatRoom & {
  members: Array<
    ChatRoomMember & {
      profile: {
        handle: string;
        display_name: string | null;
        avatar: string | null;
      } | null;
    }
  >;
  /** Last message preview for room list (truncated content or "Message deleted") */
  last_message_preview?: string | null;
  /** When the last message was sent */
  last_message_at?: string | null;
  /** Unread message count for current user */
  unread_count?: number;
};

export type MessageWithExtras = ChatMessage & {
  reactions?: Array<ChatMessageReaction & { profiles?: { handle: string }[] }>;
  attachments?: ChatMessageAttachment[];
  sender_profile?: {
    handle: string;
    display_name: string | null;
    avatar: string | null;
  } | null;
  read_by?: string[];
};

export function useChat(roomId: string | null) {
  const [room, setRoom] = useState<ChatRoomWithMembers | null>(null);
  const [messages, setMessages] = useState<MessageWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const oldestLoadedRef = useRef<{ created_at: string; id: string } | null>(
    null,
  );

  const fetchRoom = useCallback(async (id: string): Promise<boolean> => {
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

    const userIds = [...new Set((membersData ?? []).map((m) => m.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar')
      .in('id', userIds);

    const profileMap = new Map(
      (profilesData ?? []).map((p) => [
        p.id,
        { handle: p.handle, display_name: p.display_name, avatar: p.avatar },
      ]),
    );

    setError(null);
    setRoom({
      ...(roomData as ChatRoom),
      members: (membersData ?? []).map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id) ?? null,
      })) as ChatRoomWithMembers['members'],
    });
    return true;
  }, []);

  const enrichMessages = useCallback(async (msgData: ChatMessage[]) => {
    const senderIds = [
      ...new Set(
        msgData
          .map((m) => m.sender_id)
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
      (senderProfiles ?? []).map((p) => [
        p.id,
        { handle: p.handle, display_name: p.display_name, avatar: p.avatar },
      ]),
    );

    const msgIds = msgData.map((m) => m.id);
    const [reactionsRes, attachmentsRes, receiptsRes] = await Promise.all([
      msgIds.length > 0
        ? supabase
            .from('chat_message_reactions')
            .select('message_id, user_id, emoji')
            .in('message_id', msgIds)
        : { data: [] },
      msgIds.length > 0
        ? supabase
            .from('chat_message_attachments')
            .select('id, message_id, storage_path, mime_type, file_size')
            .in('message_id', msgIds)
        : { data: [] },
      msgIds.length > 0
        ? supabase
            .from('chat_read_receipts')
            .select('message_id, user_id')
            .in('message_id', msgIds)
        : { data: [] },
    ]);

    const reactionsByMsg = (reactionsRes.data ?? []).reduce<
      Record<string, Array<{ user_id: string; emoji: string }>>
    >((acc, r) => {
      if (!acc[r.message_id]) acc[r.message_id] = [];
      acc[r.message_id].push({ user_id: r.user_id, emoji: r.emoji });
      return acc;
    }, {});
    const attachmentsByMsg = (attachmentsRes.data ?? []).reduce<
      Record<
        string,
        Array<{
          id: string;
          storage_path: string;
          mime_type: string;
          file_size: number;
        }>
      >
    >((acc, a) => {
      if (!acc[a.message_id]) acc[a.message_id] = [];
      acc[a.message_id].push(a);
      return acc;
    }, {});
    const readByMsg = (receiptsRes.data ?? []).reduce<Record<string, string[]>>(
      (acc, r) => {
        if (!acc[r.message_id]) acc[r.message_id] = [];
        acc[r.message_id].push(r.user_id);
        return acc;
      },
      {},
    );

    return msgData.map((m) => ({
      ...m,
      sender_profile: m.sender_id ? (senderMap.get(m.sender_id) ?? null) : null,
      reactions: reactionsByMsg[m.id],
      attachments: attachmentsByMsg[m.id],
      read_by: readByMsg[m.id],
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
      setMessages(enriched);

      const oldest = pageAsc[0];
      oldestLoadedRef.current = oldest
        ? { created_at: oldest.created_at, id: oldest.id }
        : null;
      setHasOlderMessages(pageDesc.length === CHAT_MESSAGES_PAGE_SIZE);
    },
    [enrichMessages],
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
      setMessages((prev) => [...enrichedOlder, ...prev]);

      const oldest = olderAsc[0];
      oldestLoadedRef.current = oldest
        ? { created_at: oldest.created_at, id: oldest.id }
        : oldestLoadedRef.current;
      setHasOlderMessages(olderDesc.length === CHAT_MESSAGES_PAGE_SIZE);
    } finally {
      setLoadingOlder(false);
    }
  }, [enrichMessages, loadingOlder, roomId]);

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
      if (cancelled) return;
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId, fetchRoom, fetchMessages]);

  // Realtime subscription
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
        async (payload) => {
          const newRow = payload.new as ChatMessage;
          const { data: fullMsg } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('id', newRow.id)
            .single();

          if (fullMsg) {
            let senderProfile = null;
            if (fullMsg.sender_id) {
              const { data: p } = await supabase
                .from('profiles')
                .select('handle, display_name, avatar')
                .eq('id', fullMsg.sender_id)
                .maybeSingle();
              senderProfile = p ?? null;
            }
            const [rRes, aRes] = await Promise.all([
              supabase
                .from('chat_message_reactions')
                .select('message_id, user_id, emoji')
                .eq('message_id', fullMsg.id),
              supabase
                .from('chat_message_attachments')
                .select('id, message_id, storage_path, mime_type, file_size')
                .eq('message_id', fullMsg.id),
            ]);
            setMessages((prev) => [
              ...prev,
              {
                ...fullMsg,
                sender_profile: senderProfile,
                reactions: rRes.data ?? [],
                attachments: aRes.data ?? [],
              } as unknown as MessageWithExtras,
            ]);
          }
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
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
          );
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId]);

  const sendMessage = useCallback(
    async (content: string, attachmentPaths?: string[]) => {
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

        if (attachmentPaths && attachmentPaths.length > 0 && msg) {
          for (const p of attachmentPaths) {
            const pathParts = p.split('/');
            const fileName = pathParts[pathParts.length - 1];
            const { data: obj } = await supabase.storage
              .from('chat-attachments')
              .list(pathParts[0], { search: fileName });

            if (obj?.[0]) {
              const mimeType =
                obj[0].metadata?.mimetype ?? 'application/octet-stream';
              const fileSize =
                typeof obj[0].metadata?.size === 'number'
                  ? obj[0].metadata.size
                  : 0;
              const normalizedMime = normalizeChatAttachmentMime({
                name: fileName,
                type: mimeType,
              });
              if (!normalizedMime) {
                throw new Error('Unsupported attachment type');
              }
              if (fileSize > CHAT_MAX_FILE_BYTES) {
                throw new Error('Attachment exceeds 6MB limit');
              }
              await supabase.from('chat_message_attachments').insert({
                message_id: msg.id,
                storage_path: p,
                mime_type: normalizedMime,
                file_size: fileSize,
              });
            }
          }
          await fetchMessages(roomId);
        }
      } catch {
        setError('Your message could not be sent. Please try again.');
      } finally {
        setSending(false);
      }
    },
    [roomId, fetchMessages],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      const { error: err } = await supabase
        .from('chat_messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId);

      if (err) setError("We couldn't update that message. Please try again.");
    },
    [],
  );

  const deleteMessage = useCallback(async (messageId: string) => {
    const { error: err } = await supabase
      .from('chat_messages')
      .update({
        content: null,
        is_deleted: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (err) setError("We couldn't delete that message. Please try again.");
  }, []);

  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || !roomId || messageIds.length === 0) return;

      for (const mid of messageIds) {
        await supabase.from('chat_read_receipts').upsert(
          {
            message_id: mid,
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

      const existing = messages
        .find((m) => m.id === messageId)
        ?.reactions?.find(
          (r) => r.user_id === session.user.id && r.emoji === emoji,
        );

      if (existing) {
        await supabase.from('chat_message_reactions').delete().match({
          message_id: messageId,
          user_id: session.user.id,
          emoji,
        });
      } else {
        await supabase.from('chat_message_reactions').insert({
          message_id: messageId,
          user_id: session.user.id,
          emoji,
        });
      }

      if (roomId) await fetchMessages(roomId);
    },
    [messages, roomId, fetchMessages],
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
    [roomId, fetchRoom],
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
    [roomId, fetchRoom, fetchMessages],
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
    [roomId, fetchRoom],
  );

  const inviteMembers = useCallback(
    async (memberIds: string[]) => {
      if (!roomId) return;
      const { data: roomData } = await supabase
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', roomId)
        .is('left_at', null);
      const existing = new Set((roomData ?? []).map((r) => r.user_id));
      const toAdd = memberIds.filter((id) => !existing.has(id));
      if (toAdd.length === 0) return;
      const { count } = await supabase
        .from('chat_room_members')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .is('left_at', null);
      const current = count ?? 0;
      if (current + toAdd.length > 100) {
        throw new Error('A group can have up to 100 members.');
      }
      await supabase
        .from('chat_room_members')
        .insert(
          toAdd.map((id) => ({ room_id: roomId, user_id: id, role: 'member' })),
        );
      await fetchRoom(roomId);
    },
    [roomId, fetchRoom],
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

  return {
    room,
    messages,
    loading,
    error,
    sending,
    hasOlderMessages,
    loadingOlder,
    loadOlderMessages,
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
    refresh: () => {
      if (roomId) {
        void fetchRoom(roomId);
        void fetchMessages(roomId);
      }
    },
  };
}

export function useChatRooms() {
  const [rooms, setRooms] = useState<ChatRoomWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const { data: memberRows } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('user_id', session.user.id)
      .is('left_at', null);

    if (!memberRows?.length) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomIds = [...new Set(memberRows.map((r) => r.room_id))];

    const { data: roomData } = await supabase
      .from('chat_rooms')
      .select('*')
      .in('id', roomIds);

    const { data: blocks } = await supabase
      .from('chat_blocks')
      .select('blocker_id, blocked_user_id')
      .or(
        `blocker_id.eq.${session.user.id},blocked_user_id.eq.${session.user.id}`,
      );

    const blockedPair = new Set<string>();
    (blocks ?? []).forEach((b) => {
      const other =
        b.blocker_id === session.user.id ? b.blocked_user_id : b.blocker_id;
      blockedPair.add([session.user.id, other].sort().join(':'));
    });

    const { data: allMembersData } = await supabase
      .from('chat_room_members')
      .select('room_id, user_id, role, joined_at, left_at')
      .in('room_id', roomIds)
      .is('left_at', null);

    const membersByRoom = new Map<string, ChatRoomMember[]>();
    for (const member of allMembersData ?? []) {
      const existing = membersByRoom.get(member.room_id) ?? [];
      existing.push(member);
      membersByRoom.set(member.room_id, existing);
    }

    const profileIds = [
      ...new Set((allMembersData ?? []).map((m) => m.user_id).filter(Boolean)),
    ];
    const { data: allProfilesData } =
      profileIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, handle, display_name, avatar')
            .in('id', profileIds)
        : { data: [] };

    const profileMap = new Map(
      (allProfilesData ?? []).map((p) => [
        p.id,
        { handle: p.handle, display_name: p.display_name, avatar: p.avatar },
      ]),
    );

    const withMembers: ChatRoomWithMembers[] = [];
    for (const room of roomData ?? []) {
      const membersData = membersByRoom.get(room.id) ?? [];
      if (room.room_type === 'dm' && membersData.length === 2) {
        const other = membersData.find(
          (m) => m.user_id !== session.user.id,
        )?.user_id;
        if (
          other &&
          blockedPair.has([session.user.id, other].sort().join(':'))
        ) {
          continue;
        }
      }

      withMembers.push({
        ...(room as ChatRoom),
        members: membersData.map((m) => ({
          ...m,
          profile: profileMap.get(m.user_id) ?? null,
        })) as ChatRoomWithMembers['members'],
      });
    }

    // Fetch last message + unread count per room
    if (withMembers.length > 0) {
      const { data: summaries } = await supabase.rpc('chat_room_summaries', {
        p_room_ids: withMembers.map((rm) => rm.id),
        p_user_id: session.user.id,
      });

      type SummaryRow = {
        room_id: string;
        last_content: string | null;
        last_created_at: string;
        last_is_deleted: boolean;
        unread_count: number;
      };
      const rows = (summaries ?? []) as SummaryRow[];
      const summaryMap = new Map(
        rows.map((s) => [
          s.room_id,
          {
            last_content: s.last_content,
            last_created_at: s.last_created_at,
            last_is_deleted: s.last_is_deleted,
            unread_count: Number(s.unread_count ?? 0),
          },
        ]),
      );

      const preview = (
        content: string | null,
        isDeleted: boolean,
        maxLen = 45,
      ) => {
        if (isDeleted) return 'Message deleted';
        if (!content?.trim()) return '—';
        const t = content.trim();
        return t.length <= maxLen ? t : t.slice(0, maxLen) + '…';
      };

      withMembers.forEach((rm) => {
        const s = summaryMap.get(rm.id);
        if (s) {
          rm.last_message_preview = preview(s.last_content, s.last_is_deleted);
          rm.last_message_at = s.last_created_at;
          rm.unread_count = s.unread_count;
        }
      });
    }

    setRooms(withMembers);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchRooms();
  }, [fetchRooms]);

  const removeChat = useCallback(
    async (targetRoomId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase
        .from('chat_room_members')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', targetRoomId)
        .eq('user_id', session.user.id);
      await fetchRooms();
    },
    [fetchRooms],
  );

  const createDm = useCallback(
    async (otherUserId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data: blocked } = await supabase.rpc('chat_blocked', {
        a: session.user.id,
        b: otherUserId,
      });
      if (blocked) {
        throw new Error('You cannot message this member.');
      }

      const { data: conn } = await supabase.rpc('are_chat_connections', {
        a: session.user.id,
        b: otherUserId,
      });
      if (!conn) {
        throw new Error('You can only start 1:1 chats with Connections.');
      }

      const { data: room, error } = await supabase
        .from('chat_rooms')
        .insert({
          room_type: 'dm',
          name: null,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (!room) return null;

      await supabase.from('chat_room_members').insert([
        { room_id: room.id, user_id: session.user.id, role: 'admin' },
        { room_id: room.id, user_id: otherUserId, role: 'member' },
      ]);

      await fetchRooms();
      return room.id;
    },
    [fetchRooms],
  );

  const createGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Sign in to create a group');
      if (memberIds.length >= 100) {
        throw new Error('A group can have up to 100 members.');
      }

      const { data: roomId, error } = await supabase.rpc('chat_create_group', {
        p_name: name.trim(),
        p_member_ids: memberIds.length > 0 ? memberIds : [],
      });

      if (error) {
        const isStaleSession =
          error.code === '23503' ||
          String(error.message || '').includes('created_by_fkey');
        throw new Error(
          isStaleSession
            ? 'Your session may be stale. Sign out and sign in again, then try creating the group.'
            : toMessage(error),
        );
      }
      if (!roomId) return null;

      await fetchRooms();
      return roomId as string;
    },
    [fetchRooms],
  );

  return {
    rooms,
    loading,
    fetchRooms,
    removeChat,
    createDm,
    createGroup,
  };
}

export function useReportMessage() {
  const submitReport = useCallback(
    async (
      reportedMessageId?: string | null,
      reportedUserId?: string | null,
      category?: ChatReportCategory,
      freeText?: string,
    ) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to send reports.');
      }
      if (!reportedMessageId && !reportedUserId) {
        throw new Error('Select a message or member to report.');
      }
      if (!category) throw new Error('Choose a report reason.');

      const { error } = await supabase.from('chat_reports').insert({
        reporter_id: session.user.id,
        reported_message_id: reportedMessageId ?? null,
        reported_user_id: reportedUserId ?? null,
        category,
        free_text: freeText ?? null,
        status: 'open',
      });

      if (error) throw error;
    },
    [],
  );

  return { submitReport };
}
