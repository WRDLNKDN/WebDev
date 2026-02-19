import { Box, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
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
  isAdmin?: boolean;
};

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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
  isAdmin,
}: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<{
    el: HTMLElement;
    msg: MessageWithExtras;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleMenuOpen = (
    e: React.MouseEvent<HTMLElement>,
    msg: MessageWithExtras,
  ) => {
    e.stopPropagation();
    setAnchorEl({ el: e.currentTarget, msg });
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleEdit = () => {
    if (!anchorEl || !onEdit) return;
    setEditingId(anchorEl.msg.id);
    setEditText(anchorEl.msg.content || '');
    handleMenuClose();
  };

  const handleEditSubmit = () => {
    if (editingId && editText.trim() && onEdit) {
      onEdit(editingId, editText.trim());
    }
    setEditingId(null);
  };

  const handleDelete = () => {
    if (anchorEl && onDelete) onDelete(anchorEl.msg.id);
    handleMenuClose();
  };

  const handleReport = () => {
    if (anchorEl && onReport) onReport(anchorEl.msg.id);
    handleMenuClose();
  };

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 2,
      }}
    >
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
            {roomType === 'group' && !isOwn && (
              <Typography variant="caption" color="primary" sx={{ mb: 0.25 }}>
                {handle ? `@${handle}` : displayName}
              </Typography>
            )}
            <Box
              sx={{
                ...GLASS_CARD,
                px: 1.5,
                py: 1,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.5,
              }}
            >
              {editingId === msg.id ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    flex: 1,
                  }}
                >
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
                <>
                  <Typography
                    variant="body2"
                    sx={{ flex: 1, whiteSpace: 'pre-wrap' }}
                  >
                    {msg.content || ''}
                  </Typography>
                  {canAct && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, msg)}
                      aria-label="Message options"
                      sx={{ color: 'rgba(255,255,255,0.6)' }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </>
              )}
            </Box>
            {(msg.edited_at ||
              (roomType === 'dm' &&
                isOwn &&
                otherUserId &&
                msg.read_by?.includes(otherUserId))) && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.25 }}
              >
                {msg.edited_at && 'Edited'}
                {roomType === 'dm' &&
                  isOwn &&
                  otherUserId &&
                  msg.read_by?.includes(otherUserId) && (
                    <>{msg.edited_at ? ' · ' : ''}Read</>
                  )}
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
                      {count > 1 ? count : ''}
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
          </Box>
        );
      })}

      <Menu
        anchorEl={anchorEl?.el}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
        <MenuItem onClick={handleReport}>Report</MenuItem>
        {isAdmin && (
          <MenuItem onClick={handleDelete} sx={{ color: 'warning.main' }}>
            Delete (moderate)
          </MenuItem>
        )}
      </Menu>

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
        maxWidth: 120,
        maxHeight: 120,
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
          sx={{ width: '100%', height: 'auto', display: 'block' }}
        />
      ) : (
        <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.3)', fontSize: 12 }}>
          {signedUrl ? 'File' : '…'}
        </Box>
      )}
    </Box>
  );
};
