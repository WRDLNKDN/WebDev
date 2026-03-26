import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import ForwardIcon from '@mui/icons-material/Forward';
import ReplyIcon from '@mui/icons-material/Reply';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useCallback, useRef, useEffect, useState } from 'react';
import { useAppToast } from '../../../context/AppToastContext';
import { PostCard } from '../../post';
import type { PostActionMenuItem } from '../../post/PostActionMenu';
import { CHAT_REACTION_OPTIONS } from '../../post/sharedReactions';
import {
  fetchChatLinkPreview,
  getFirstUrlFromText,
  type ChatLinkPreview,
} from '../../../lib/chat/linkPreview';
import { truncateSnippet } from '../../../lib/chat/messageSnippet';
import type { MessageWithExtras } from '../../../hooks/chatTypes';
import type { ChatRoomType } from '../../../types/chat';
import { getGlassCard } from '../../../theme/candyStyles';
import { MessageContent } from './MessageContent';
import { AttachmentPreview } from './AttachmentPreview';

const CHAT_PANEL_BG = '#282C34';

/**
 * Message row actions use the kebab menu only (no inline action bars).
 * Menu order: Reply → Forward → Copy → Edit (own) → Delete (own) → Report.
 * Moderator/admin delete is not shown here; backend policies remain unchanged.
 */

type MessageListProps = {
  messages: MessageWithExtras[];
  currentUserId: string;
  roomType: ChatRoomType;
  otherUserId?: string;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onReport?: (messageId: string, senderUserId?: string | null) => void;
  onStartReply?: (message: MessageWithExtras) => void;
  onForward?: (message: MessageWithExtras) => void;
  onMessagesViewed?: (messageIds: string[]) => void;
  onLoadOlder?: () => void;
  hasOlderMessages?: boolean;
  loadingOlder?: boolean;
  compact?: boolean;
  /** When true, show typing/presence avatar at bottom right (chat panel style) */
  typingAvatarUrl?: string | null;
  showTyping?: boolean;
  /** Message ID to scroll to when loaded (from URL query param) */
  scrollToMessageId?: string | null;
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
  onStartReply,
  onForward,
  onMessagesViewed,
  onLoadOlder,
  hasOlderMessages = false,
  loadingOlder = false,
  compact = false,
  typingAvatarUrl,
  showTyping = false,
  scrollToMessageId,
}: MessageListProps) => {
  const { showToast } = useAppToast();
  const theme = useTheme();
  const isLightChrome = theme.palette.mode === 'light';
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousBoundaryRef = useRef<{
    firstId: string | null;
    lastId: string | null;
  }>({
    firstId: null,
    lastId: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [reactionMenuAnchor, setReactionMenuAnchor] = useState<{
    el: HTMLElement;
    messageId: string;
  } | null>(null);
  const [linkPreviews, setLinkPreviews] = useState<
    Record<string, ChatLinkPreview | null>
  >({});
  const fetchedPreviewIds = useRef<Set<string>>(new Set());
  const hasScrolledToMessage = useRef<string | null>(null);

  const handleCopyMessage = useCallback(
    async (msg: MessageWithExtras) => {
      const text = (msg.content ?? '').trim();
      if (!text) {
        showToast({ message: 'Nothing to copy.', severity: 'info' });
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast({ message: 'Message copied.', severity: 'success' });
      } catch {
        showToast({ message: 'Could not copy.', severity: 'error' });
      }
    },
    [showToast],
  );

  useEffect(() => {
    const nextFirst = messages[0]?.id ?? null;
    const nextLast = messages[messages.length - 1]?.id ?? null;
    const prev = previousBoundaryRef.current;
    const prependedOlder =
      prev.firstId !== null &&
      prev.lastId !== null &&
      nextFirst !== prev.firstId &&
      nextLast === prev.lastId;
    const appendedNew = nextLast !== prev.lastId;

    // Handle scrolling to specific message from notification link
    if (scrollToMessageId) {
      // Reset scroll state if message ID changed
      if (hasScrolledToMessage.current !== scrollToMessageId) {
        hasScrolledToMessage.current = scrollToMessageId;
      }

      const targetMessage = messages.find((m) => m.id === scrollToMessageId);
      if (targetMessage) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          const messageEl = messageRefs.current.get(scrollToMessageId);
          if (messageEl) {
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the message briefly
            messageEl.style.transition = 'background-color 0.3s ease';
            messageEl.style.backgroundColor = 'rgba(45, 212, 191, 0.2)';
            setTimeout(() => {
              messageEl.style.backgroundColor = '';
              setTimeout(() => {
                messageEl.style.transition = '';
              }, 300);
            }, 2000);
          }
        });
        return;
      } else if (
        hasOlderMessages &&
        !loadingOlder &&
        hasScrolledToMessage.current === scrollToMessageId
      ) {
        // Message not found in current view, try loading older messages
        // Only try once per message ID to avoid infinite loops
        onLoadOlder?.();
      }
    } else {
      // Reset scroll state when no message ID
      hasScrolledToMessage.current = null;
    }

    if (appendedNew && !prependedOlder && !scrollToMessageId) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    previousBoundaryRef.current = { firstId: nextFirst, lastId: nextLast };
  }, [
    messages,
    scrollToMessageId,
    hasOlderMessages,
    loadingOlder,
    onLoadOlder,
  ]);

  useEffect(() => {
    if (roomType === 'dm' && onMessagesViewed && messages.length > 0) {
      const fromOther = messages
        .filter(
          (m) => m.sender_id && m.sender_id !== currentUserId && !m.is_deleted,
        )
        .map((m) => m.id);
      if (fromOther.length > 0) {
        onMessagesViewed(fromOther);
      }
    }
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
    // Mark as in-flight before the first await so concurrent renders don't re-queue them
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
    // linkPreviews intentionally omitted from deps — fetchedPreviewIds ref deduplicates
    // without causing this effect to re-run every time a preview resolves.
  }, [messages]);

  const handleEditSubmit = () => {
    if (editingId && editText.trim() && onEdit) {
      onEdit(editingId, editText.trim());
    }
    setEditingId(null);
  };

  return (
    <Box
      data-testid="chat-message-scroll"
      sx={{
        flex: 1,
        overflow: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 1 : 1.5,
        p: compact ? 1.25 : 2,
        bgcolor: isLightChrome
          ? theme.palette.background.default
          : CHAT_PANEL_BG,
        position: 'relative',
        minWidth: 0,
        width: '100%',
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
              border: `1px solid ${alpha(theme.palette.primary.main, isLightChrome ? 0.35 : 0.38)}`,
              bgcolor: alpha(
                theme.palette.primary.main,
                isLightChrome ? 0.08 : 0.1,
              ),
              color: 'text.secondary',
              textTransform: 'none',
            }}
          >
            {loadingOlder ? 'Loading older…' : 'Load older messages'}
          </Button>
        </Box>
      )}
      {messages.map((msg) => {
        const isOwn = msg.sender_id === currentUserId;
        const canAct = isOwn && !msg.is_system_message && !msg.is_deleted;
        const showKebabMenu = !msg.is_system_message && !msg.is_deleted;

        const kebabItems: PostActionMenuItem[] = (() => {
          if (!showKebabMenu) return [];
          const items: PostActionMenuItem[] = [
            {
              label: 'Reply',
              icon: <ReplyIcon fontSize="small" />,
              onClick: () => onStartReply?.(msg),
            },
            {
              label: 'Forward',
              icon: <ForwardIcon fontSize="small" />,
              onClick: () => onForward?.(msg),
            },
            {
              label: 'Copy',
              icon: <ContentCopyIcon fontSize="small" />,
              onClick: () => void handleCopyMessage(msg),
            },
          ];
          if (isOwn) {
            items.push(
              {
                label: 'Edit',
                icon: <EditOutlinedIcon fontSize="small" />,
                onClick: () => {
                  setEditingId(msg.id);
                  setEditText(msg.content || '');
                },
              },
              {
                label: 'Delete',
                icon: <DeleteOutlineIcon fontSize="small" />,
                danger: true,
                onClick: () => onDelete?.(msg.id),
              },
            );
          }
          items.push({
            label: 'Report',
            icon: <FlagOutlinedIcon fontSize="small" />,
            danger: true,
            onClick: () => onReport?.(msg.id, msg.sender_id),
          });
          return items;
        })();

        if (msg.is_system_message) {
          return (
            <Box key={msg.id} sx={{ textAlign: 'center', py: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {msg.content}
              </Typography>
            </Box>
          );
        }

        if (msg.is_deleted) {
          return (
            <Box key={msg.id} sx={{ textAlign: 'left', px: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                fontStyle="italic"
              >
                Message deleted
              </Typography>
            </Box>
          );
        }

        const displayName =
          msg.sender_profile?.display_name ||
          msg.sender_profile?.handle ||
          'Deleted user';
        const handle = msg.sender_profile?.handle;

        return (
          <Box
            key={msg.id}
            ref={(el: HTMLDivElement | null) => {
              if (el) {
                messageRefs.current.set(msg.id, el);
              } else {
                messageRefs.current.delete(msg.id);
              }
            }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              maxWidth: { xs: '100%', sm: '85%' },
              minWidth: 0,
              position: 'relative',
            }}
          >
            <PostCard
              author={{
                avatarUrl: msg.sender_profile?.avatar ?? null,
                displayName,
                handle: handle ?? null,
                createdAt: msg.created_at,
                editedAt: msg.edited_at ?? null,
                formatTime: formatMessageTime,
                inIcon: true,
              }}
              actionMenu={
                showKebabMenu && kebabItems.length > 0
                  ? {
                      visible: true,
                      ariaLabel: 'Message options',
                      items: kebabItems,
                    }
                  : null
              }
              sx={{
                ...getGlassCard(theme),
                borderRadius: 2,
                bgcolor: isOwn
                  ? isLightChrome
                    ? alpha(theme.palette.primary.main, 0.16)
                    : 'rgba(37, 99, 235, 0.34)'
                  : isLightChrome
                    ? alpha(theme.palette.common.black, 0.05)
                    : 'rgba(17, 24, 39, 0.6)',
                borderColor: isOwn
                  ? isLightChrome
                    ? alpha(theme.palette.primary.main, 0.42)
                    : 'rgba(147,197,253,0.55)'
                  : alpha(
                      theme.palette.primary.light,
                      isLightChrome ? 0.28 : 0.26,
                    ),
                minWidth: 0,
                width: '100%',
                maxWidth: '100%',
              }}
              contentSx={{ pt: 1.5, pb: 1, px: 1.5 }}
            >
              {msg.reply_preview && editingId !== msg.id ? (
                <Box
                  sx={{
                    mb: 0.75,
                    pl: 1,
                    borderLeft: '3px solid',
                    borderColor: 'primary.light',
                    opacity: msg.reply_preview.is_deleted ? 0.72 : 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {msg.reply_preview.is_deleted
                      ? 'Replying to deleted message'
                      : `Replying to ${msg.reply_preview.sender_profile?.display_name || msg.reply_preview.sender_profile?.handle || 'Member'}`}
                  </Typography>
                  {!msg.reply_preview.is_deleted ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {truncateSnippet(msg.reply_preview.content ?? '')}
                    </Typography>
                  ) : null}
                </Box>
              ) : null}
              {editingId === msg.id ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) handleEditSubmit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: 8,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.38)}`,
                      background: isLightChrome
                        ? theme.palette.background.paper
                        : 'rgba(0,0,0,0.2)',
                      color: isLightChrome
                        ? theme.palette.text.primary
                        : '#ffffff',
                      width: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                    }}
                    aria-label="Edit message"
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography
                      component="button"
                      variant="caption"
                      onClick={handleEditSubmit}
                      sx={{ cursor: 'pointer', color: 'primary.main' }}
                    >
                      Save
                    </Typography>
                    <Typography
                      component="button"
                      variant="caption"
                      onClick={() => setEditingId(null)}
                      sx={{ cursor: 'pointer', color: 'text.secondary' }}
                    >
                      Cancel
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <MessageContent content={msg.content || ''} />
              )}
              {roomType === 'dm' &&
                isOwn &&
                otherUserId &&
                msg.read_by?.includes(otherUserId) && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.25, display: 'block' }}
                  >
                    Read
                  </Typography>
                )}
              {msg.attachments && msg.attachments.length > 0 && (
                <Box
                  sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}
                >
                  {msg.attachments.map(
                    (a: {
                      id: string;
                      storage_path: string;
                      mime_type: string;
                    }) => (
                      <AttachmentPreview
                        key={a.id}
                        path={a.storage_path}
                        mimeType={a.mime_type}
                      />
                    ),
                  )}
                </Box>
              )}
              {linkPreviews[msg.id] && (
                <Box
                  component="a"
                  href={linkPreviews[msg.id]?.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    mt: 0.6,
                    display: 'block',
                    width: '100%',
                    maxWidth: 340,
                    textDecoration: 'none',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    border: `1px solid ${alpha(theme.palette.primary.light, 0.28)}`,
                    bgcolor: isLightChrome
                      ? alpha(theme.palette.common.black, 0.04)
                      : 'rgba(0,0,0,0.25)',
                  }}
                >
                  {linkPreviews[msg.id]?.image && (
                    <Box
                      component="img"
                      src={linkPreviews[msg.id]?.image}
                      alt={linkPreviews[msg.id]?.title || 'Link preview'}
                      width={400}
                      height={140}
                      sx={{
                        width: '100%',
                        height: 140,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  )}
                  <Box sx={{ p: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.25 }}
                    >
                      {linkPreviews[msg.id]?.siteName || 'Link'}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ lineHeight: 1.3, mb: 0.25 }}
                    >
                      {linkPreviews[msg.id]?.title || linkPreviews[msg.id]?.url}
                    </Typography>
                    {linkPreviews[msg.id]?.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {linkPreviews[msg.id]?.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              {/* Reactions: existing pills + one emoji icon that opens popup menu (like message input) */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.25,
                  flexWrap: 'wrap',
                }}
              >
                {msg.reactions && msg.reactions.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
                    {Object.entries(
                      msg.reactions.reduce<Record<string, number>>((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                        return acc;
                      }, {}),
                    ).map(([emoji, count]: [string, number]) => (
                      <Typography
                        key={emoji}
                        component="button"
                        variant="caption"
                        onClick={() => onReaction?.(msg.id, emoji)}
                        sx={{
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          lineHeight: 1.2,
                          px: 0.5,
                          py: 0.15,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                          border: `1px solid ${alpha(theme.palette.primary.light, 0.22)}`,
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.light, 0.18),
                          },
                        }}
                      >
                        {emoji}
                        {count > 0 ? ` ${count}` : ''}
                      </Typography>
                    ))}
                  </Box>
                )}
                {canAct && (
                  <Tooltip title="Add reaction">
                    <IconButton
                      size="small"
                      onClick={(e) =>
                        setReactionMenuAnchor({
                          el: e.currentTarget,
                          messageId: msg.id,
                        })
                      }
                      aria-label="Add reaction"
                      aria-haspopup="true"
                      aria-expanded={reactionMenuAnchor?.messageId === msg.id}
                      sx={{
                        p: 0.25,
                        color: alpha(theme.palette.text.primary, 0.55),
                        '&:hover': {
                          color: theme.palette.text.primary,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                    >
                      <EmojiEmotionsOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </PostCard>
          </Box>
        );
      })}

      <Menu
        anchorEl={reactionMenuAnchor?.el ?? null}
        open={Boolean(reactionMenuAnchor)}
        onClose={() => setReactionMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 160,
              bgcolor: theme.palette.background.paper,
              border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
              borderRadius: 2,
            },
          },
        }}
      >
        {CHAT_REACTION_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => {
              if (reactionMenuAnchor) {
                onReaction?.(reactionMenuAnchor.messageId, option.value);
                setReactionMenuAnchor(null);
              }
            }}
            sx={{ gap: 1, py: 0.75 }}
          >
            <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>
              {option.emoji}
            </span>
            {option.label}
          </MenuItem>
        ))}
      </Menu>

      {showTyping && typingAvatarUrl && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 12,
            zIndex: 1,
          }}
        >
          <Box
            component="img"
            src={typingAvatarUrl}
            alt=""
            width={24}
            height={24}
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
              objectFit: 'cover',
            }}
          />
        </Box>
      )}

      <div ref={bottomRef} />
    </Box>
  );
};
