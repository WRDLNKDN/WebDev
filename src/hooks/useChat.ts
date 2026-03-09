import { useRef, useState } from 'react';
import type { ChatRoomWithMembers, MessageWithExtras } from './chatTypes';
import { useChatActions } from './useChatActions';
import { useChatDataLoader } from './useChatDataLoader';
import { useChatRealtime } from './useChatRealtime';

export function useChat(roomId: string | null) {
  const [room, setRoom] = useState<ChatRoomWithMembers | null>(null);
  const [messages, setMessages] = useState<MessageWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const oldestLoadedRef = useRef<{ created_at: string; id: string } | null>(
    null,
  );

  const { fetchRoom, fetchMessages, loadOlderMessages } = useChatDataLoader({
    roomId,
    loadingOlder,
    oldestLoadedRef,
    setRoom,
    setMessages,
    setLoading,
    setError,
    setHasOlderMessages,
    setLoadingOlder,
  });

  useChatRealtime({ roomId, setMessages });

  const {
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
  } = useChatActions({
    roomId,
    room,
    messages,
    setMessages,
    setError,
    setLoading,
    setSending,
    fetchRoom,
    fetchMessages,
  });

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
    refresh,
  };
}

export { useChatRooms } from './useChatRooms';
export { useReportMessage } from './useReportMessage';
export type { ChatRoomWithMembers, MessageWithExtras } from './chatTypes';
