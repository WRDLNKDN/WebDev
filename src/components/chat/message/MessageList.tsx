import { Box, Button, Menu } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import {
  fetchChatLinkPreview,
  getFirstUrlFromText,
  type ChatLinkPreview,
} from '../../../lib/chat/linkPreview';
import type { MessageWithExtras } from '../../../hooks/useChat';
import type { ChatRoomType } from '../../../types/chat';
import { ChatMessageRow } from './ChatMessageRow';

const CHAT_PANEL_BG = '#282C34';
const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

type MessageListProps = {
  messages: MessageWithExtras[];
  currentUserId: string;
  roomType: ChatRoomType;
  otherUserId?: string;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onReport?: (messageId: string) => void;
  onMessagesViewed?: (messageIds: string[]) => void;
  onLoadOlder?: () => void;
  hasOlderMessages?: boolean;
  loadingOlder?: boolean;
  isAdmin?: boolean;
  compact?: boolean;
  typingAvatarUrl?: string | null;
  showTyping?: boolean;
};

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const MessageList = ({
  messages,
  currentUserId,
  roomType,
  otherUserId,
  onEdit,
  onDelete,
  onReaction,
  onReport,
  onMessagesViewed,
  onLoadOlder,
  hasOlderMessages = false,
  loadingOlder = false,
  isAdmin,
  compact = false,
  typingAvatarUrl,
  showTyping = false,
}: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousBoundaryRef = useRef<{
    firstId: string | null;
    lastId: string | null;
  }>({ firstId: null, lastId: null });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [reactionMenuAnchor, setReactionMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [reactionMenuMessageId, setReactionMenuMessageId] = useState<
    string | null
  >(null);
  const [linkPreviews, setLinkPreviews] = useState<
    Record<string, ChatLinkPreview | null>
  >({});
  const fetchedPreviewIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const nextFirst = messages[0]?.id ?? null;
    const nextLast = messages[messages.length - 1]?.id ?? null;
    const prev = previousBoundaryRef.current;
    const prependedOlder =
      prev.firstId !== null &&
      prev.lastId !== null &&
      nextFirst !== prev.firstId &&
      nextLast === prev.lastId;
    if (!prependedOlder)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    previousBoundaryRef.current = { firstId: nextFirst, lastId: nextLast };
  }, [messages]);

  useEffect(() => {
    if (roomType !== 'dm' || !onMessagesViewed || messages.length === 0) return;
    const fromOther = messages
      .filter(
        (m) => m.sender_id && m.sender_id !== currentUserId && !m.is_deleted,
      )
      .map((m) => m.id);
    if (fromOther.length > 0) onMessagesViewed(fromOther);
  }, [roomType, messages, currentUserId, onMessagesViewed]);

  useEffect(() => {
    const nextTargets = messages
      .filter(
        (m) => !m.is_deleted && typeof m.content === 'string' && m.content,
      )
      .map((m) => ({ id: m.id, url: getFirstUrlFromText(m.content ?? '') }))
      .filter((x): x is { id: string; url: string } => Boolean(x.url))
      .filter((x) => !fetchedPreviewIds.current.has(x.id));

    if (nextTargets.length === 0) return;
    nextTargets.forEach((t) => fetchedPreviewIds.current.add(t.id));
    let cancelled = false;
    void (async () => {
      for (const target of nextTargets) {
        const preview = await fetchChatLinkPreview(target.url);
        if (cancelled) return;
        setLinkPreviews((prev) => ({ ...prev, [target.id]: preview }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [messages]);

  return (
    <Box
      data-testid="chat-message-scroll"
      sx={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 1 : 1.5,
        p: compact ? 1.25 : 2,
        bgcolor: CHAT_PANEL_BG,
        position: 'relative',
      }}
    >
      {hasOlderMessages && onLoadOlder && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 0.5 }}>
          <Button
            data-testid="chat-load-older"
            size="small"
            variant="outlined"
            onClick={onLoadOlder}
            disabled={loadingOlder}
            sx={{
              border: '1px solid rgba(255,255,255,0.2)',
              bgcolor: 'rgba(255,255,255,0.04)',
              color: 'text.secondary',
              textTransform: 'none',
            }}
          >
            {loadingOlder ? 'Loading older…' : 'Load older messages'}
          </Button>
        </Box>
      )}

      {messages.map((msg) => (
        <ChatMessageRow
          key={msg.id}
          msg={msg}
          currentUserId={currentUserId}
          roomType={roomType}
          otherUserId={otherUserId}
          isAdmin={isAdmin}
          editingId={editingId}
          editText={editText}
          setEditingId={setEditingId}
          setEditText={setEditText}
          onEdit={onEdit}
          onDelete={onDelete}
          onReaction={onReaction}
          onReport={onReport}
          onOpenReactionMenu={(anchor, messageId) => {
            setReactionMenuAnchor(anchor);
            setReactionMenuMessageId(messageId);
          }}
          linkPreview={linkPreviews[msg.id]}
          formatMessageTime={formatMessageTime}
        />
      ))}

      <Menu
        anchorEl={reactionMenuAnchor}
        open={Boolean(reactionMenuAnchor)}
        onClose={() => {
          setReactionMenuAnchor(null);
          setReactionMenuMessageId(null);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              bgcolor: 'rgba(40,44,52,0.98)',
              border: '1px solid rgba(255,255,255,0.12)',
              py: 0.5,
              px: 0.5,
            },
          },
        }}
        MenuListProps={{
          sx: { display: 'flex', gap: 0.25, flexWrap: 'wrap', maxWidth: 220 },
        }}
      >
        {COMMON_EMOJIS.map((emoji) => (
          <Box
            key={emoji}
            component="button"
            type="button"
            onClick={() => {
              if (reactionMenuMessageId)
                onReaction?.(reactionMenuMessageId, emoji);
              setReactionMenuAnchor(null);
              setReactionMenuMessageId(null);
            }}
            sx={{
              cursor: 'pointer',
              fontSize: '1.25rem',
              p: 0.75,
              borderRadius: 1,
              border: 'none',
              bgcolor: 'transparent',
              color: 'inherit',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            {emoji}
          </Box>
        ))}
      </Menu>

      {showTyping && typingAvatarUrl && (
        <Box sx={{ position: 'absolute', bottom: 8, right: 12, zIndex: 1 }}>
          <Box
            component="img"
            src={typingAvatarUrl}
            alt=""
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.2)',
              objectFit: 'cover',
            }}
          />
        </Box>
      )}

      <div ref={bottomRef} />
    </Box>
  );
};
