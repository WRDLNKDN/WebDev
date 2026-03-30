import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useAppToast } from '../../context/AppToastContext';
import { ForwardMessageDialog } from '../../components/chat/dialogs/ForwardMessageDialog';
import { ChatRoomHeader } from '../../components/chat/room/ChatRoomHeader';
import {
  MessageInput,
  type MessageReplyDraft,
} from '../../components/chat/message/MessageInput';
import { ChatThreadMessageList } from '../../components/chat/message/ChatThreadMessageList';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import type { MessageWithExtras } from '../../hooks/chatTypes';
import { formatForwardedChatText } from '../../lib/chat/formatForwardedChatText';
import { roomMembersToMentionable } from '../../lib/chat/groupMentionMembers';

type ChatPageContentPaneProps = {
  roomId?: string;
  uid: string;
  room: ChatRoomWithMembers | null;
  /** Sidebar room list — used to pick a destination when forwarding. */
  rooms: ChatRoomWithMembers[];
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
  isRoomAdmin: boolean;
  otherMember:
    | {
        user_id: string;
        profile?: { avatar?: string | null } | null;
      }
    | undefined;
  messages: MessageWithExtras[];
  chatLoading: boolean;
  error: string | null;
  sending: boolean;
  hasOlderMessages: boolean;
  loadingOlder: boolean;
  onLeave: () => Promise<void>;
  onOpenBlock: () => void;
  onOpenInvite: () => void;
  onOpenDetails: () => void;
  onOpenManage: () => void;
  onOpenMembers: () => void;
  onBack: () => void;
  onRefresh: () => void;
  onLoadOlder: () => void;
  onEditMessage: (id: string, text: string) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  onReport: (messageId?: string, senderUserId?: string | null) => void;
  onMessagesViewed: (messageIds: string[]) => Promise<void>;
  onSendMessage: Parameters<typeof MessageInput>[0]['onSend'];
  onForwardMessage: (targetRoomId: string, content: string) => Promise<boolean>;
  onTyping: () => void;
  onStopTyping: () => void;
  /** Deep-link scroll target (e.g. from notification `?message=`). */
  scrollToMessageId?: string | null;
};

export const ChatPageContentPane = ({
  roomId,
  uid,
  room,
  rooms,
  onlineUsers,
  typingUsers,
  isRoomAdmin,
  otherMember,
  messages,
  chatLoading,
  error,
  sending,
  hasOlderMessages,
  loadingOlder,
  onLeave,
  onOpenBlock,
  onOpenInvite,
  onOpenDetails,
  onOpenManage,
  onOpenMembers,
  onBack,
  onRefresh,
  onLoadOlder,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onReport,
  onMessagesViewed,
  onSendMessage,
  onForwardMessage,
  onTyping,
  onStopTyping,
  scrollToMessageId = null,
}: ChatPageContentPaneProps) => {
  const { showToast } = useAppToast();
  const [replyTarget, setReplyTarget] = useState<MessageReplyDraft | null>(
    null,
  );
  const [forwardSource, setForwardSource] = useState<MessageWithExtras | null>(
    null,
  );

  useEffect(() => {
    setReplyTarget(null);
    setForwardSource(null);
  }, [roomId]);

  const forwardAuthorLabel = useCallback((m: MessageWithExtras) => {
    return (
      m.sender_profile?.display_name || m.sender_profile?.handle || 'Member'
    );
  }, []);

  const handleForwardToRoom = useCallback(
    async (targetRoomId: string) => {
      if (!forwardSource) return;
      const body = formatForwardedChatText(
        forwardSource.content,
        forwardAuthorLabel(forwardSource),
      );
      const ok = await onForwardMessage(targetRoomId, body);
      if (ok) {
        setForwardSource(null);
        showToast({ message: 'Message forwarded.', severity: 'success' });
      }
    },
    [forwardAuthorLabel, forwardSource, onForwardMessage, showToast],
  );

  return (
    <Box
      sx={{
        flex: 1,
        display: { xs: roomId ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      {roomId ? (
        <>
          <ChatRoomHeader
            room={room}
            currentUserId={uid}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
            isRoomAdmin={isRoomAdmin}
            onLeave={onLeave}
            onBlock={onOpenBlock}
            onInvite={onOpenInvite}
            onEditDetails={onOpenDetails}
            onManageMembers={onOpenManage}
            onShowMembers={onOpenMembers}
            onBack={onBack}
          />

          {error && (
            <Box
              sx={{
                px: 2,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Typography color="error" variant="body2">
                {error}
              </Typography>
              <Button size="small" variant="outlined" onClick={onRefresh}>
                Try again
              </Button>
            </Box>
          )}

          {chatLoading ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <ChatThreadMessageList
              messages={messages}
              currentUserId={uid}
              roomType={room?.room_type ?? 'dm'}
              otherUserId={otherMember?.user_id}
              loadOlderMessages={onLoadOlder}
              hasOlderMessages={hasOlderMessages}
              loadingOlder={loadingOlder}
              editMessage={onEditMessage}
              deleteMessage={onDeleteMessage}
              toggleReaction={onToggleReaction}
              markAsRead={onMessagesViewed}
              forwardAuthorLabel={forwardAuthorLabel}
              onReport={(msgId, senderUserId) =>
                onReport(msgId, senderUserId ?? undefined)
              }
              replyTargetSetter={setReplyTarget}
              onForwardSource={setForwardSource}
              typingAvatarUrl={
                room?.room_type === 'dm'
                  ? (otherMember?.profile?.avatar ?? null)
                  : undefined
              }
              showTyping={
                !!(
                  room?.room_type === 'dm' &&
                  otherMember?.user_id &&
                  typingUsers.has(otherMember.user_id)
                )
              }
              scrollToMessageId={scrollToMessageId}
            />
          )}

          <MessageInput
            onSend={onSendMessage}
            onTyping={onTyping}
            onStopTyping={onStopTyping}
            disabled={chatLoading}
            sending={sending}
            roomId={roomId ?? null}
            roomType={room?.room_type ?? 'dm'}
            groupMembers={roomMembersToMentionable(room)}
            currentUserId={uid}
            replyTo={replyTarget}
            onCancelReply={() => setReplyTarget(null)}
          />

          <ForwardMessageDialog
            open={Boolean(forwardSource)}
            onClose={() => setForwardSource(null)}
            rooms={rooms}
            excludeRoomId={roomId}
            currentUserId={uid}
            onSelectRoom={handleForwardToRoom}
            busy={sending}
          />
        </>
      ) : null}
    </Box>
  );
};
