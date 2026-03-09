import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import { Box, IconButton, Typography } from '@mui/material';
import { PostCard } from '../../post';
import type { MessageWithExtras } from '../../../hooks/useChat';
import type { ChatRoomType } from '../../../types/chat';
import type { ChatLinkPreview } from '../../../lib/chat/linkPreview';
import { GLASS_CARD } from '../../../theme/candyStyles';
import { AttachmentPreview } from './AttachmentPreview';

type Props = {
  msg: MessageWithExtras;
  currentUserId: string;
  roomType: ChatRoomType;
  otherUserId?: string;
  isAdmin?: boolean;
  editingId: string | null;
  editText: string;
  setEditingId: (id: string | null) => void;
  setEditText: (value: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onReport?: (messageId: string) => void;
  onOpenReactionMenu: (anchor: HTMLElement, messageId: string) => void;
  linkPreview?: ChatLinkPreview | null;
  formatMessageTime: (iso: string) => string;
};

export const ChatMessageRow = ({
  msg,
  currentUserId,
  roomType,
  otherUserId,
  isAdmin,
  editingId,
  editText,
  setEditingId,
  setEditText,
  onEdit,
  onDelete,
  onReaction,
  onReport,
  onOpenReactionMenu,
  linkPreview,
  formatMessageTime,
}: Props) => {
  const isOwn = msg.sender_id === currentUserId;
  const canAct = isOwn && !msg.is_system_message && !msg.is_deleted;
  const reactionCounts = Object.entries(
    (msg.reactions ?? []).reduce<Record<string, number>>(
      (
        acc: Record<string, number>,
        r: { emoji: string },
      ): Record<string, number> => {
        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
        return acc;
      },
      {},
    ),
  ) as [string, number][];

  if (msg.is_system_message) {
    return (
      <Box sx={{ textAlign: 'center', py: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {msg.content}
        </Typography>
      </Box>
    );
  }

  if (msg.is_deleted) {
    return (
      <Box sx={{ textAlign: 'left', px: 1 }}>
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          Message deleted
        </Typography>
      </Box>
    );
  }

  const displayName =
    msg.sender_profile?.display_name ||
    msg.sender_profile?.handle ||
    'Deleted user';
  const handleEditSubmit = () => {
    if (editingId && editText.trim() && onEdit)
      onEdit(editingId, editText.trim());
    setEditingId(null);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        maxWidth: '85%',
        position: 'relative',
      }}
    >
      <PostCard
        author={{
          avatarUrl: msg.sender_profile?.avatar ?? null,
          displayName,
          handle: msg.sender_profile?.handle ?? null,
          createdAt: msg.created_at,
          editedAt: msg.edited_at ?? null,
          formatTime: formatMessageTime,
          inIcon: true,
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
          bgcolor: isOwn ? 'rgba(37, 99, 235, 0.34)' : 'rgba(17, 24, 39, 0.6)',
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
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            {msg.attachments.map(
              (a: { id: string; storage_path: string; mime_type: string }) => (
                <AttachmentPreview
                  key={a.id}
                  path={a.storage_path}
                  mimeType={a.mime_type}
                />
              ),
            )}
          </Box>
        )}

        {linkPreview && (
          <Box
            component="a"
            href={linkPreview.url ?? '#'}
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
            {linkPreview.image && (
              <Box
                component="img"
                src={linkPreview.image}
                alt={linkPreview.title || 'Link preview'}
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
                {linkPreview.siteName || 'Link'}
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ lineHeight: 1.3, mb: 0.25 }}
              >
                {linkPreview.title || linkPreview.url}
              </Typography>
              {linkPreview.description && (
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
                  {linkPreview.description}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.25,
            flexWrap: 'wrap',
          }}
        >
          {reactionCounts.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
              {reactionCounts.map(([emoji, count]) => (
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
            <IconButton
              type="button"
              size="small"
              onClick={(e) => onOpenReactionMenu(e.currentTarget, msg.id)}
              aria-label="Add reaction"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                p: 0.25,
                '&:hover': {
                  color: 'rgba(255,255,255,0.9)',
                  bgcolor: 'rgba(255,255,255,0.06)',
                },
              }}
            >
              <EmojiEmotionsOutlinedIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          )}
        </Box>
      </PostCard>
    </Box>
  );
};
