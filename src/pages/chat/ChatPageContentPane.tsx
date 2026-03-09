import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { ChatRoomHeader } from '../../components/chat/room/ChatRoomHeader';
import { MessageInput } from '../../components/chat/message/MessageInput';
import { MessageList } from '../../components/chat/message/MessageList';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import { ChatPageEmptyState } from './ChatPageEmptyState';

type ChatPageContentPaneProps = {
  roomId?: string;
  uid: string;
  room: ChatRoomWithMembers | null;
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
  isRoomAdmin: boolean;
  otherMember:
    | {
        user_id: string;
        profile?: { avatar?: string | null } | null;
      }
    | undefined;
  messages: Parameters<typeof MessageList>[0]['messages'];
  chatLoading: boolean;
  error: string | null;
  sending: boolean;
  hasOlderMessages: boolean;
  loadingOlder: boolean;
  isAdmin: boolean;
  onLeave: () => Promise<void>;
  onOpenBlock: () => void;
  onOpenInvite: () => void;
  onOpenRename: () => void;
  onOpenManage: () => void;
  onBack: () => void;
  onRefresh: () => void;
  onLoadOlder: () => void;
  onEditMessage: (id: string, text: string) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  onReport: (messageId?: string, userId?: string) => void;
  onMessagesViewed: (messageIds: string[]) => Promise<void>;
  onSendMessage: (text: string) => Promise<void>;
  onTyping: () => void;
  onStopTyping: () => void;
  onStartDm: () => void;
  onCreateGroup: () => void;
};

export const ChatPageContentPane = ({
  roomId,
  uid,
  room,
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
  isAdmin,
  onLeave,
  onOpenBlock,
  onOpenInvite,
  onOpenRename,
  onOpenManage,
  onBack,
  onRefresh,
  onLoadOlder,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onReport,
  onMessagesViewed,
  onSendMessage,
  onTyping,
  onStopTyping,
  onStartDm,
  onCreateGroup,
}: ChatPageContentPaneProps) => (
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
          onRename={onOpenRename}
          onManageMembers={onOpenManage}
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
          <MessageList
            messages={messages}
            currentUserId={uid}
            roomType={room?.room_type ?? 'dm'}
            otherUserId={otherMember?.user_id}
            onLoadOlder={onLoadOlder}
            hasOlderMessages={hasOlderMessages}
            loadingOlder={loadingOlder}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onReaction={onToggleReaction}
            onReport={(msgId) => onReport(msgId)}
            onMessagesViewed={onMessagesViewed}
            isAdmin={isAdmin}
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
          />
        )}

        <MessageInput
          onSend={onSendMessage}
          onTyping={onTyping}
          onStopTyping={onStopTyping}
          disabled={sending || chatLoading}
        />
      </>
    ) : (
      <ChatPageEmptyState onStartDm={onStartDm} onCreateGroup={onCreateGroup} />
    )}
  </Box>
);
