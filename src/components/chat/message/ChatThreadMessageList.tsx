import type { MessageWithExtras } from '../../../hooks/chatTypes';
import type { ChatRoomType } from '../../../types/chat';
import { truncateSnippet } from '../../../lib/chat/messageSnippet';
import { MessageList } from './MessageList';

type ChatThreadMessageListProps = {
  messages: MessageWithExtras[];
  currentUserId: string;
  roomType: ChatRoomType;
  otherUserId?: string;
  hasOlderMessages: boolean;
  loadingOlder: boolean;
  loadOlderMessages: () => void | Promise<void>;
  editMessage: (messageId: string, content: string) => void | Promise<void>;
  deleteMessage: (messageId: string) => void | Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => void | Promise<void>;
  markAsRead: (messageIds: string[]) => void | Promise<void>;
  forwardAuthorLabel: (msg: MessageWithExtras) => string;
  onReport: (messageId?: string, senderUserId?: string | null) => void;
  replyTargetSetter: (draft: {
    id: string;
    authorLabel: string;
    contentSnippet: string;
  }) => void;
  onForwardSource: (msg: MessageWithExtras) => void;
  compact?: boolean;
  scrollToMessageId?: string | null;
  typingAvatarUrl?: string | null;
  showTyping?: boolean;
};

/**
 * Single wiring point for MessageList across full chat, popout, and popover (Sonar dedupe).
 */
export const ChatThreadMessageList = ({
  messages,
  currentUserId,
  roomType,
  otherUserId,
  hasOlderMessages,
  loadingOlder,
  loadOlderMessages,
  editMessage,
  deleteMessage,
  toggleReaction,
  markAsRead,
  forwardAuthorLabel,
  onReport,
  replyTargetSetter,
  onForwardSource,
  compact,
  scrollToMessageId,
  typingAvatarUrl,
  showTyping,
}: ChatThreadMessageListProps) => {
  return (
    <MessageList
      messages={messages}
      currentUserId={currentUserId}
      roomType={roomType}
      otherUserId={otherUserId}
      onLoadOlder={() => void loadOlderMessages()}
      hasOlderMessages={hasOlderMessages}
      loadingOlder={loadingOlder}
      onEdit={editMessage}
      onDelete={deleteMessage}
      onReaction={toggleReaction}
      onReport={(msgId, senderUserId) => onReport(msgId, senderUserId)}
      onStartReply={(msg) =>
        replyTargetSetter({
          id: msg.id,
          authorLabel: forwardAuthorLabel(msg),
          contentSnippet: truncateSnippet(msg.content ?? ''),
        })
      }
      onForward={onForwardSource}
      onMessagesViewed={markAsRead}
      compact={compact}
      scrollToMessageId={scrollToMessageId ?? undefined}
      typingAvatarUrl={typingAvatarUrl}
      showTyping={showTyping}
    />
  );
};
