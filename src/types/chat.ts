/**
 * Chat types for WRDLNKDN MVP chat (Supabase-backed).
 */

export type ChatRoomType = 'dm' | 'group';

export type ChatReportCategory =
  | 'harassment'
  | 'spam'
  | 'inappropriate_content'
  | 'other';

export type ChatReportStatus = 'open' | 'under_review' | 'resolved';

export type ChatRoom = {
  id: string;
  room_type: ChatRoomType;
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ChatRoomMember = {
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  left_at: string | null;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string | null;
  content: string | null;
  is_system_message: boolean;
  is_deleted: boolean;
  edited_at: string | null;
  created_at: string;
};

export type ChatMessageReaction = {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type ChatMessageAttachment = {
  id: string;
  message_id: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

export type ChatReport = {
  id: string;
  reporter_id: string;
  reported_message_id: string | null;
  reported_user_id: string | null;
  category: ChatReportCategory;
  free_text: string | null;
  status: ChatReportStatus;
  created_at: string;
};

export type ChatRoomWithDetails = ChatRoom & {
  members?: Array<
    ChatRoomMember & {
      profile?: {
        handle: string;
        display_name: string | null;
        avatar: string | null;
      };
    }
  >;
  last_message?: ChatMessage | null;
  unread_count?: number;
  is_favorite?: boolean;
};

export const CHAT_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export const CHAT_ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
] as const;

export const CHAT_ALLOWED_ACCEPT = [
  ...CHAT_ALLOWED_MIME,
  ...CHAT_ALLOWED_EXTENSIONS,
].join(',');

/** Max size for direct upload without server-side processing (non-GIF and small GIF). */
export const CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES = 2 * 1024 * 1024;
/**
 * GIFs larger than {@link CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES} but within this limit are
 * sent to server transcoding (e.g. MP4). Keep in sync with `CHAT_GIF_PROCESSING_MAX_BYTES` in backend.
 */
export const CHAT_GIF_PROCESSING_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES =
  CHAT_GIF_PROCESSING_MAX_FILE_BYTES;
/** Alias for direct-upload ceiling (non-GIF); do not use as max for GIF processing. */
export const CHAT_MAX_FILE_BYTES = CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES;
export const CHAT_MAX_ATTACHMENTS_PER_MESSAGE = 1;
export const CHAT_MAX_GROUP_MEMBERS = 100;

/** Metadata for a chat attachment passed from upload step to send (avoids storage.list). */
export type ChatAttachmentMeta = { path: string; mime: string; size: number };
