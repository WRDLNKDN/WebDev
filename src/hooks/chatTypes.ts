import type {
  ChatMessage,
  ChatMessageAttachment,
  ChatMessageReaction,
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
  last_message_preview?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  is_favorite?: boolean;
};

export type MessageReplyPreview = {
  id: string;
  content: string | null;
  is_deleted: boolean;
  sender_profile: {
    handle: string;
    display_name: string | null;
    avatar: string | null;
  } | null;
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
  /** Populated client-side from `reply_to_message_id`. */
  reply_preview?: MessageReplyPreview | null;
};
