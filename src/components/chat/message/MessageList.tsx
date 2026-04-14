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
  useMediaQuery,
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
import { LinkPreviewCard } from '../../../pages/feed/feedRenderUtils';
import { truncateSnippet } from '../../../lib/chat/messageSnippet';
import type { MessageWithExtras } from '../../../hooks/chatTypes';
import type { ChatRoomType } from '../../../types/chat';
import { MessageContent } from './MessageContent';
import { AttachmentPreview } from './AttachmentPreview';

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
  /**
   * When `auto` (default), message kebab / add-reaction stay visible on narrow viewports
   * and coarse pointers; hidden until row hover on desktop with fine pointer.
   */
  messageActionsReveal?: 'auto' | 'always' | 'hover-focus';
};

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatMessageDay(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
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
  messageActionsReveal = 'auto',
}: MessageListProps) => {
  const { showToast } = useAppToast();
  const theme = useTheme();
  const isLightChrome = theme.palette.mode === 'light';
  const canFinePointerHover = useMediaQuery('(hover: hover)');
  const isNarrowViewport = useMediaQuery(theme.breakpoints.down('md'));
  const useHoverRevealActions =
    messageActionsReveal === 'hover-focus' ||
    (messageActionsReveal === 'auto' &&
      canFinePointerHover &&
      !isNarrowViewport);
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
  const linkPreviewsRef = useRef<Record<string, ChatLinkPreview | null>>({});
  const previewUrlByMessageIdRef = useRef<Record<string, string>>({});
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
    const nextPreviewTargets = messages
      .filter(
        (m) => !m.is_deleted && typeof m.content === 'string' && m.content,
      )
      .map((m) => ({ id: m.id, url: getFirstUrlFromText(m.content ?? '') }))
      .filter((x): x is { id: string; url: string | null } => Boolean(x.id));

    const nextPreviewUrlByMessageId: Record<string, string> = {};
    for (const target of nextPreviewTargets) {
      if (target.url) {
        nextPreviewUrlByMessageId[target.id] = target.url;
      }
    }

    const previousPreviewUrlByMessageId = previewUrlByMessageIdRef.current;
    previewUrlByMessageIdRef.current = nextPreviewUrlByMessageId;

    setLinkPreviews((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [messageId, previousUrl] of Object.entries(
        previousPreviewUrlByMessageId,
      )) {
        if (nextPreviewUrlByMessageId[messageId] !== previousUrl) {
          if (messageId in next) {
            delete next[messageId];
            changed = true;
          }
        }
      }
      for (const [messageId] of Object.entries(prev)) {
        if (!nextPreviewUrlByMessageId[messageId]) {
          if (messageId in next) {
            delete next[messageId];
            changed = true;
          }
        }
      }
      const resolved = changed ? next : prev;
      linkPreviewsRef.current = resolved;
      return resolved;
    });

    const targetsToFetch = Object.entries(nextPreviewUrlByMessageId)
      .filter(
        ([messageId, url]) =>
          previousPreviewUrlByMessageId[messageId] !== url ||
          !(messageId in linkPreviewsRef.current),
      )
      .map(([id, url]) => ({ id, url }));

    if (targetsToFetch.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const target of targetsToFetch) {
        const preview = await fetchChatLinkPreview(target.url);
        if (cancelled) return;
        if (previewUrlByMessageIdRef.current[target.id] !== target.url)
          continue;
        setLinkPreviews((prev) => {
          const next = { ...prev, [target.id]: preview };
          linkPreviewsRef.current = next;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
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
        scrollBehavior: 'smooth',
        overscrollBehavior: 'contain',
        scrollbarGutter: 'stable',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 0.45 : 0.75,
        px: compact ? 1 : { xs: 1.15, sm: 1.5 },
        py: compact ? 0.75 : 1.1,
        bgcolor: isLightChrome
          ? alpha(theme.palette.background.default, 0.97)
          : alpha('#0f141d', 0.9),
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
            variant="text"
            onClick={onLoadOlder}
            disabled={loadingOlder}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                bgcolor: alpha(
                  theme.palette.primary.main,
                  isLightChrome ? 0.06 : 0.1,
                ),
              },
            }}
          >
            {loadingOlder ? 'Loading older…' : 'Load older messages'}
          </Button>
        </Box>
      )}
      {messages.map((msg, msgIndex) => {
        const prev = msgIndex > 0 ? messages[msgIndex - 1] : null;
        const showDaySeparator =
          !prev ||
          new Date(prev.created_at).toDateString() !==
            new Date(msg.created_at).toDateString();
        const isContinuation =
          Boolean(prev) &&
          !msg.is_system_message &&
          !msg.is_deleted &&
          !prev!.is_system_message &&
          !prev!.is_deleted &&
          prev!.sender_id === msg.sender_id;

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

        const revealMenu =
          useHoverRevealActions && showKebabMenu && kebabItems.length > 0;

        let messageBubbleBgcolor: string;
        if (isOwn) {
          messageBubbleBgcolor = isLightChrome
            ? alpha(theme.palette.primary.main, 0.12)
            : alpha(theme.palette.primary.main, 0.2);
        } else {
          messageBubbleBgcolor = isLightChrome
            ? alpha(theme.palette.common.black, 0.03)
            : alpha('#ffffff', 0.045);
        }

        let messageInsetShadowAlpha: number;
        if (isOwn) {
          messageInsetShadowAlpha = isLightChrome ? 0.12 : 0.18;
        } else {
          messageInsetShadowAlpha = 0.08;
        }

        return (
          <Box key={msg.id}>
            {showDaySeparator ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 0.75,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.1,
                    py: 0.3,
                    borderRadius: 999,
                    color: 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.68rem',
                    letterSpacing: '0.01em',
                    bgcolor: alpha(
                      theme.palette.common.black,
                      isLightChrome ? 0.035 : 0.16,
                    ),
                  }}
                >
                  {formatMessageDay(msg.created_at)}
                </Typography>
              </Box>
            ) : null}
            <Box
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
                alignItems: isOwn ? 'flex-end' : 'flex-start',
                maxWidth: { xs: '78%', sm: '74%' },
                minWidth: 0,
                position: 'relative',
                mt: isContinuation ? (compact ? -0.2 : -0.3) : 0,
                ml: isOwn ? 'auto' : 0,
                transition: 'box-shadow 0.18s ease',
                '@media (hover: hover)': {
                  '&:hover': {
                    filter: isLightChrome ? undefined : 'brightness(1.03)',
                  },
                },
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
                  continuation: isContinuation,
                }}
                actionMenu={
                  showKebabMenu && kebabItems.length > 0
                    ? {
                        visible: true,
                        ariaLabel: 'Message options',
                        items: kebabItems,
                        reveal: revealMenu ? 'hover-focus' : 'always',
                        menuDensity: 'subtle',
                      }
                    : null
                }
                sx={{
                  borderRadius: 2,
                  border: 'none',
                  bgcolor: messageBubbleBgcolor,
                  boxShadow: `0 0 0 1px ${alpha(
                    isOwn ? theme.palette.primary.main : theme.palette.divider,
                    messageInsetShadowAlpha,
                  )} inset`,
                  minWidth: 0,
                  width: '100%',
                  maxWidth: '100%',
                  '@media (hover: hover)': {
                    '&:hover': {
                      boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, isLightChrome ? 0.24 : 0.34)} inset, 0 4px 14px ${alpha(theme.palette.common.black, isLightChrome ? 0.05 : 0.11)}`,
                    },
                  },
                }}
                contentSx={{
                  pt: isContinuation ? 0.3 : 0.7,
                  pb: 0.55,
                  px: 0.9,
                  '&:last-child': { pb: 0.65 },
                }}
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
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey)
                          handleEditSubmit();
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
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      mt: 0.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    {msg.attachments.map(
                      (a: {
                        id: string;
                        storage_path: string;
                        mime_type: string;
                        file_size?: number;
                        created_at?: string;
                      }) => (
                        <AttachmentPreview
                          key={a.id}
                          path={a.storage_path}
                          mimeType={a.mime_type}
                          attachmentId={a.id}
                          fileSize={a.file_size}
                          createdAt={a.created_at}
                        />
                      ),
                    )}
                  </Box>
                )}
                {(() => {
                  const preview = linkPreviews[msg.id];
                  if (!preview) return null;
                  return (
                    <Box
                      sx={{
                        mt: 0.5,
                        width: '100%',
                        maxWidth: { xs: '100%', sm: 400 },
                      }}
                    >
                      <LinkPreviewCard preview={preview} variant="chat" />
                    </Box>
                  );
                })()}
                {/* Reactions: existing pills + one emoji icon that opens popup menu (like message input) */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mt: 0.35,
                    flexWrap: 'wrap',
                  }}
                >
                  {msg.reactions && msg.reactions.length > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.35,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      {Object.entries(
                        msg.reactions.reduce<Record<string, number>>(
                          (acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                            return acc;
                          },
                          {},
                        ),
                      ).map(([emoji, count]: [string, number]) => (
                        <Typography
                          key={emoji}
                          component="button"
                          variant="caption"
                          onClick={() => onReaction?.(msg.id, emoji)}
                          sx={{
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                            lineHeight: 1.25,
                            px: 0.65,
                            py: 0.2,
                            borderRadius: 10,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            border: 'none',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.16),
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
                      <Box
                        component="span"
                        className={
                          useHoverRevealActions && showKebabMenu
                            ? 'chat-message-reveal-actions'
                            : undefined
                        }
                        sx={{ display: 'inline-flex', verticalAlign: 'middle' }}
                      >
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
                          aria-expanded={
                            reactionMenuAnchor?.messageId === msg.id
                          }
                          sx={{
                            p: 0.35,
                            color: alpha(theme.palette.text.primary, 0.34),
                            '&:hover': {
                              color: theme.palette.text.primary,
                              bgcolor: alpha(theme.palette.primary.main, 0.07),
                            },
                            '&:focus-visible': {
                              bgcolor: alpha(theme.palette.primary.main, 0.12),
                            },
                          }}
                        >
                          <EmojiEmotionsOutlinedIcon
                            sx={{ fontSize: '1.05rem' }}
                          />
                        </IconButton>
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              </PostCard>
            </Box>
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
