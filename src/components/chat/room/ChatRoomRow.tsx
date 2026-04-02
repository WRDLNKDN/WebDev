import CloseIcon from '@mui/icons-material/Close';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import {
  Box,
  IconButton,
  ListItemButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import type { ChatRoomWithMembers } from '../../../hooks/useChat';
import { getChatRoomLabel } from '../../../lib/chat/roomListState';
import { createNormalizedGroupImageAsset } from '../../../lib/media/assets';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';
import {
  CHAT_FAVORITE_ACTIVE_BUTTON_SX,
  CHAT_FAVORITE_ICON_BUTTON_STAR_SX,
  CHAT_FAVORITE_IDLE_BUTTON_SX,
  CHAT_FAVORITE_ROW_BADGE_SX,
} from '../../../theme/chatFavoriteStyles';

function formatConversationTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function roomListPreviewCaption(room: ChatRoomWithMembers): string {
  if (room.last_message_preview) return room.last_message_preview;
  if (room.room_type === 'group') {
    return room.description ?? `${room.members?.length ?? 0} members`;
  }
  return 'No messages yet';
}

function chatRoomRowHoverBg(
  isSelected: boolean,
  isLightChrome: boolean,
  theme: Theme,
): string {
  if (isSelected) {
    return isLightChrome
      ? alpha(theme.palette.primary.main, 0.17)
      : alpha(theme.palette.primary.main, 0.26);
  }
  return isLightChrome
    ? alpha(theme.palette.action.hover, 0.45)
    : 'rgba(255,255,255,0.055)';
}

function getRoomListAvatarSrc(
  room: ChatRoomWithMembers,
  currentUserId?: string,
): string | undefined {
  if (room.room_type === 'dm') {
    return (
      room.members?.find((member) => member.user_id !== currentUserId)?.profile
        ?.avatar ?? undefined
    );
  }
  return (
    createNormalizedGroupImageAsset(room)?.displayUrl ??
    room.image_url ??
    undefined
  );
}

export type ChatRoomRowProps = {
  room: ChatRoomWithMembers;
  currentUserId?: string;
  activeRoomId?: string;
  base: string;
  isLightChrome: boolean;
  theme: Theme;
  panelPrimaryText: string;
  panelSecondaryText: string;
  onToggleFavorite?: (roomId: string, isFavorite: boolean) => void;
  onRemoveChat?: (roomId: string) => void;
  onRequestRemove: (roomId: string, label: string) => void;
};

export const ChatRoomRow = ({
  room,
  currentUserId,
  activeRoomId,
  base,
  isLightChrome,
  theme,
  panelPrimaryText,
  panelSecondaryText,
  onToggleFavorite,
  onRemoveChat,
  onRequestRemove,
}: ChatRoomRowProps) => {
  const navigate = useNavigate();
  const isSelected = activeRoomId === room.id;

  return (
    <ListItemButton
      selected={isSelected}
      onClick={() => navigate(`${base}/${room.id}`)}
      sx={{
        ...(isSelected
          ? {
              bgcolor: isLightChrome
                ? alpha(theme.palette.primary.main, 0.14)
                : alpha(theme.palette.primary.main, 0.22),
              boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}, 0 0 0 1px ${alpha(theme.palette.primary.main, isLightChrome ? 0.2 : 0.28)}`,
            }
          : {}),
        borderBottom: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.06 : 0.045)}`,
        display: 'flex',
        alignItems: 'center',
        gap: 0.85,
        py: { xs: 0.65, sm: 0.75 },
        px: { xs: 1, sm: 1.1 },
        borderRadius: 0,
        my: 0,
        color: panelPrimaryText,
        '& .chat-room-row-actions': {
          opacity: { xs: 1, md: 0 },
          transition: 'opacity 140ms ease',
        },
        '@media (hover: hover)': {
          '&:hover .chat-room-row-actions, &:focus-within .chat-room-row-actions':
            {
              opacity: 1,
            },
          '&:hover': {
            bgcolor: chatRoomRowHoverBg(isSelected, isLightChrome, theme),
          },
        },
        '&:focus-visible': {
          outline: `2px solid ${alpha(theme.palette.primary.main, 0.45)}`,
          outlineOffset: -2,
        },
      }}
    >
      <ProfileAvatar
        src={getRoomListAvatarSrc(room, currentUserId)}
        alt={getChatRoomLabel(room, currentUserId)}
        size="small"
        sx={{ width: 36, height: 36, flexShrink: 0 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{ minWidth: 0, width: '100%' }}
        >
          <Typography
            variant="body2"
            fontWeight={isSelected ? 700 : 600}
            noWrap
            sx={{
              color: panelPrimaryText,
              flex: 1,
              minWidth: 0,
              pr: 0.5,
              letterSpacing: '-0.01em',
            }}
          >
            {getChatRoomLabel(room, currentUserId)}
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.35}
            sx={{ flexShrink: 0 }}
          >
            <Typography
              variant="caption"
              sx={{
                color: panelSecondaryText,
                fontSize: '0.6875rem',
                fontWeight: 500,
                opacity: 0.92,
                textAlign: 'right',
              }}
            >
              {formatConversationTime(room.last_message_at)}
            </Typography>
            {room.is_favorite ? (
              <StarIcon
                aria-hidden
                data-testid={`chat-room-favorite-badge-${room.id}`}
                sx={CHAT_FAVORITE_ROW_BADGE_SX}
              />
            ) : null}
          </Stack>
        </Stack>
        <Typography
          variant="caption"
          color={panelSecondaryText}
          sx={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mt: 0.2,
            lineHeight: 1.35,
            opacity: 0.92,
          }}
        >
          {roomListPreviewCaption(room)}
        </Typography>
      </Box>
      {(onToggleFavorite || onRemoveChat) && (
        <Box
          className="chat-room-row-actions"
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 0.15,
          }}
        >
          {onToggleFavorite && (
            <Tooltip
              title={
                room.is_favorite ? 'Remove from favorites' : 'Add to favorites'
              }
            >
              <span>
                <IconButton
                  type="button"
                  aria-label={
                    room.is_favorite
                      ? 'Remove from favorites'
                      : 'Add to favorites'
                  }
                  aria-pressed={Boolean(room.is_favorite)}
                  data-testid={`chat-room-favorite-${room.id}`}
                  size="small"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    Promise.resolve(
                      onToggleFavorite(room.id, Boolean(room.is_favorite)),
                    ).catch(() => {});
                  }}
                  sx={{
                    borderRadius: 1.25,
                    minWidth: 32,
                    minHeight: 32,
                    transition:
                      'color 120ms ease, background-color 120ms ease, border-color 120ms ease, opacity 120ms ease',
                    ...(room.is_favorite
                      ? CHAT_FAVORITE_ACTIVE_BUTTON_SX
                      : CHAT_FAVORITE_IDLE_BUTTON_SX),
                  }}
                >
                  {room.is_favorite ? (
                    <StarIcon
                      sx={CHAT_FAVORITE_ICON_BUTTON_STAR_SX}
                      data-testid={`chat-room-favorite-icon-filled-${room.id}`}
                    />
                  ) : (
                    <StarBorderIcon
                      fontSize="small"
                      data-testid={`chat-room-favorite-icon-outline-${room.id}`}
                    />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
          {onRemoveChat && (
            <Tooltip title="Remove conversation">
              <span>
                <IconButton
                  aria-label="Remove conversation"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestRemove(
                      room.id,
                      getChatRoomLabel(room, currentUserId),
                    );
                  }}
                  sx={{
                    color: isLightChrome
                      ? 'text.secondary'
                      : 'rgba(255,255,255,0.65)',
                    borderRadius: 1,
                    minWidth: 30,
                    minHeight: 30,
                    '&:hover': {
                      bgcolor: isLightChrome
                        ? 'action.hover'
                        : 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      )}
    </ListItemButton>
  );
};
