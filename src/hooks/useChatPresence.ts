import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/auth/supabaseClient';

export function useChatPresence(
  roomId: string | null,
  currentUserId: string | undefined,
) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!roomId || !currentUserId || !channelRef.current) return;

      void channelRef.current.track({
        user_id: currentUserId,
        online: true,
        typing,
      });
    },
    [roomId, currentUserId],
  );

  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const channel = supabase.channel(`chat-presence-${roomId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ user_id?: string; online?: boolean; typing?: boolean }>
        >;
        const online = new Set<string>();
        const typing = new Set<string>();

        Object.values(state)
          .flat()
          .forEach((p) => {
            const uid = p.user_id ?? '';
            if (uid && uid !== currentUserId) {
              if (p.online) online.add(uid);
              if (p.typing) typing.add(uid);
            }
          });

        setOnlineUsers(online);
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUserId,
            online: true,
            typing: false,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      void channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, currentUserId]);

  const startTyping = useCallback(() => {
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      typingTimeoutRef.current = null;
    }, 3000);
  }, [setTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setTyping(false);
  }, [setTyping]);

  return {
    onlineUsers,
    typingUsers,
    setTyping,
    startTyping,
    stopTyping,
  };
}
