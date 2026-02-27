import { Box, Button, Typography } from '@mui/material';
import React, { useRef, useEffect, useState } from 'react';
import { PostCard } from '../post';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  fetchChatLinkPreview,
  getFirstUrlFromText,
  type ChatLinkPreview,
} from '../../lib/chat/linkPreview';
import type { MessageWithExtras } from '../../hooks/useChat';
import type { ChatRoomType } from '../../types/chat';
import { GLASS_CARD } from '../../theme/candyStyles';

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
};

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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
}: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousBoundaryRef = useRef<{
    firstId: string | null;
    lastId: string | null;
  }>({
    firstId: null,
    lastId: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [linkPreviews, setLinkPreviews] = useState<
    Record<string, ChatLinkPreview | null>
  >({});

  useEffect(() => {
    const nextFirst = messages[0]?.id ?? null;
    const nextLast = messages[messages.length - 1]?.id ?? null;
    const prev = previousBoundaryRef.current;
    const prependedOlder =
      prev.firstId !== null &&
      prev.lastId !== null &&
      nextFirst !== prev.firstId &&
      nextLast === prev.lastId;
    if (!prependedOlder) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    previousBoundaryRef.current = { firstId: nextFirst, lastId: nextLast };
  }, [messages]);

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
      .filter((x) => !(x.id in linkPreviews));

    if (nextTargets.length === 0) return;
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
  }, [messages, linkPreviews]);

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
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 1 : 1.5,
        p: compact ? 1.25 : 2,
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
      {messages.map((msg) => {
        const isOwn = msg.sender_id === currentUserId;
        const canAct = isOwn && !msg.is_system_message && !msg.is_deleted;

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
            <Box
              key={msg.id}
              sx={{ textAlign: isOwn ? 'right' : 'left', px: 1 }}
            >
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
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isOwn ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
              position: 'relative',
              '&:hover .msg-reaction-bar': {
                opacity: 1,
                pointerEvents: 'auto',
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
              }}
              actionMenu={
                canAct
                  ? {
                      visible: true,
                      ariaLabel: 'Message options',
                      items: [
                        {
                          label: 'Edit',
                          onClick: () => {
                            setEditingId(msg.id);
                            setEditText(msg.content || '');
                          },
                        },
                        {
                          label: 'Delete',
                          onClick: () => onDelete?.(msg.id),
                          danger: true,
                        },
                        {
                          label: 'Report',
                          onClick: () => onReport?.(msg.id),
                          danger: true,
                        },
                        ...(isAdmin
                          ? [
                              {
                                label: 'Delete (moderate)',
                                onClick: () => onDelete?.(msg.id),
                                danger: true,
                              },
                            ]
                          : []),
                      ],
                    }
                  : null
              }
              sx={{
                ...GLASS_CARD,
                borderRadius: 2,
                bgcolor: isOwn
                  ? 'rgba(37, 99, 235, 0.34)'
                  : 'rgba(17, 24, 39, 0.6)',
                borderColor: isOwn
                  ? 'rgba(147,197,253,0.55)'
                  : 'rgba(255,255,255,0.12)',
              }}
              contentSx={{ pt: 1.5, pb: 1, px: 1.5 }}
            >
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
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(0,0,0,0.2)',
                      color: 'white',
                      minWidth: 200,
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
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', display: 'block' }}
                >
                  {msg.content || ''}
                </Typography>
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
                    border: '1px solid rgba(255,255,255,0.15)',
                    bgcolor: 'rgba(0,0,0,0.25)',
                  }}
                >
                  {linkPreviews[msg.id]?.image && (
                    <Box
                      component="img"
                      src={linkPreviews[msg.id]?.image}
                      alt={linkPreviews[msg.id]?.title || 'Link preview'}
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
              {/* Reactions: compact pills under message, only show quick-add on hover */}
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
                          bgcolor: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                        }}
                      >
                        {emoji}
                        {count > 0 ? ` ${count}` : ''}
                      </Typography>
                    ))}
                  </Box>
                )}
                {canAct && (
                  <Box
                    className="msg-reaction-bar"
                    sx={{
                      display: 'flex',
                      gap: 0.25,
                      opacity: 0,
                      transition: 'opacity 0.15s',
                      pointerEvents: 'none',
                    }}
                  >
                    {COMMON_EMOJIS.map((emoji) => (
                      <Typography
                        key={emoji}
                        component="button"
                        variant="caption"
                        onClick={() => onReaction?.(msg.id, emoji)}
                        sx={{
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          p: 0.25,
                          borderRadius: 0.5,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                        }}
                      >
                        {emoji}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </PostCard>
          </Box>
        );
      })}

      <div ref={bottomRef} />
    </Box>
  );
};

const AttachmentPreview = ({
  path,
  mimeType,
}: {
  path: string;
  mimeType: string;
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isImage = mimeType.startsWith('image/');

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(path, 3600);
      if (!cancelled && data?.signedUrl) setSignedUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <Box
      component="a"
      href={signedUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: 'block',
        maxWidth: 220,
        maxHeight: 220,
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      {isImage && signedUrl ? (
        <Box
          component="img"
          src={signedUrl}
          alt="Attachment"
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: 220,
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.3)', fontSize: 12 }}>
          {signedUrl ? 'File' : '…'}
        </Box>
      )}
    </Box>
  );
};
