import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type {
  ChatMessage,
  ChatMessageAttachment,
  ChatMessageReaction,
  ChatReportCategory,
  ChatRoom,
  ChatRoomMember,
} from '../types/chat';

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

  const fetchRoom = useCallback(async (id: string) => {
    const { data: roomData, error: roomErr } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (roomErr || !roomData) {
      setError(roomErr?.message ?? 'Room not found');
      setRoom(null);
      return;
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

    setRoom({
      ...(roomData as ChatRoom),
      members: (membersData ?? []).map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id) ?? null,
      })) as ChatRoomWithMembers['members'],
    });
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    const { data: msgData, error: msgErr } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true });

    if (msgErr) {
      setError(msgErr.message);
      setMessages([]);
      return;
    }

    const senderIds = [
      ...new Set(
        (msgData ?? [])
          .map((m) => m.sender_id)
          .filter((id): id is string => id != null),
      ),
    ];
    const { data: senderProfiles } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar')
      .in('id', senderIds);

    const senderMap = new Map(
      (senderProfiles ?? []).map((p) => [
        p.id,
        { handle: p.handle, display_name: p.display_name, avatar: p.avatar },
      ]),
    );

    const msgIds = (msgData ?? []).map((m) => m.id);
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

    const enriched = (msgData ?? []).map((m) => ({
      ...m,
      sender_profile: m.sender_id ? (senderMap.get(m.sender_id) ?? null) : null,
      reactions: reactionsByMsg[m.id],
      attachments: attachmentsByMsg[m.id],
      read_by: readByMsg[m.id],
    }));

    setMessages(enriched as unknown as MessageWithExtras[]);
  }, []);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      await fetchRoom(roomId);
      if (cancelled) return;
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
        setError('Not authenticated');
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
              await supabase.from('chat_message_attachments').insert({
                message_id: msg.id,
                storage_path: p,
                mime_type:
                  obj[0].metadata?.mimetype ?? 'application/octet-stream',
                file_size: obj[0].metadata?.size ?? 0,
              });
            }
          }
          await fetchMessages(roomId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send');
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

      if (err) setError(err.message);
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

    if (err) setError(err.message);
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

      await fetchMessages(roomId ?? '');
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
      if (current + toAdd.length > 100) throw new Error('Max 100 members');
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

    const withMembers: ChatRoomWithMembers[] = [];

    for (const r of roomData ?? []) {
      const { data: membersData } = await supabase
        .from('chat_room_members')
        .select('room_id, user_id, role, joined_at, left_at')
        .eq('room_id', r.id)
        .is('left_at', null);

      if (r.room_type === 'dm' && membersData?.length === 2) {
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

      withMembers.push({
        ...(r as ChatRoom),
        members: (membersData ?? []).map((m) => ({
          ...m,
          profile: profileMap.get(m.user_id) ?? null,
        })) as ChatRoomWithMembers['members'],
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
        throw new Error('You cannot message this user');
      }

      const { data: conn } = await supabase.rpc('are_chat_connections', {
        a: session.user.id,
        b: otherUserId,
      });
      if (!conn) {
        throw new Error('Only connections can start 1:1 chats');
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
      if (memberIds.length >= 100) throw new Error('Max 100 members');

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
            : (error.message ?? 'Could not create group'),
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
      if (!session?.user) throw new Error('Not authenticated');
      if (!reportedMessageId && !reportedUserId)
        throw new Error('Report message or user');
      if (!category) throw new Error('Category required');

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
