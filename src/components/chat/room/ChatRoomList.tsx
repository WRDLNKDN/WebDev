import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import CloseIcon from '@mui/icons-material/Close';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SearchIcon from '@mui/icons-material/Search';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ChatRoomWithMembers } from '../../../hooks/useChat';
import {
  deriveVisibleChatRooms,
  getChatRoomLabel,
} from '../../../lib/chat/roomListState';
import { RemoveChatConfirmDialog } from '../dialogs/RemoveChatConfirmDialog';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';
import {
  CHAT_FAVORITE_ACTIVE_BUTTON_SX,
  CHAT_FAVORITE_ICON_BUTTON_STAR_SX,
  CHAT_FAVORITE_IDLE_BUTTON_SX,
  CHAT_FAVORITE_ROW_BADGE_SX,
} from '../../../theme/chatFavoriteStyles';

type ChatRoomListProps = {
  rooms: ChatRoomWithMembers[];
  loading: boolean;
  currentUserId?: string;
  onCreateGroup?: () => void;
  onStartDm?: () => void;
  onRemoveChat?: (roomId: string) => void;
  onToggleFavorite?: (roomId: string, isFavorite: boolean) => void;
  /** Base path for room links (e.g. /chat-full so room clicks stay on full chat page). Default /chat. */
  chatPathPrefix?: string;
  /** When false, hide the top “Messages” heading (e.g. docked shell has its own title). */
  showMessagesHeading?: boolean;
};

const DEFAULT_CHAT_PREFIX = '/chat';

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

export const ChatRoomList = ({
  rooms,
  loading,
  currentUserId,
  onCreateGroup,
  onStartDm,
  onRemoveChat,
  onToggleFavorite,
  chatPathPrefix = DEFAULT_CHAT_PREFIX,
  showMessagesHeading = true,
}: ChatRoomListProps) => {
  const theme = useTheme();
  const isLightChrome = theme.palette.mode === 'light';
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const base = chatPathPrefix.replace(/\/$/, '');
  const panelPrimaryText = isLightChrome
    ? theme.palette.text.primary
    : 'rgba(252,250,255,0.96)';
  const panelSecondaryText = isLightChrome
    ? theme.palette.text.secondary
    : 'rgba(220,207,248,0.9)';

  const visibleRooms = useMemo(
    () =>
      deriveVisibleChatRooms(rooms, {
        currentUserId,
        filter: 'all',
        sort: 'favorites',
      }),
    [currentUserId, rooms],
  );

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleRooms;
    return visibleRooms.filter((room) => {
      const label = getChatRoomLabel(room, currentUserId).toLowerCase();
      const preview = (room.last_message_preview ?? '').toLowerCase();
      return label.includes(q) || preview.includes(q);
    });
  }, [visibleRooms, searchQuery, currentUserId]);

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        borderRight: {
          xs: 'none',
          md: `1px solid ${alpha(theme.palette.primary.light, 0.22)}`,
        },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          p: { xs: 1.2, sm: 1.35 },
          borderBottom: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.14 : 0.08)}`,
          background: isLightChrome
            ? alpha(theme.palette.background.paper, 0.92)
            : 'linear-gradient(180deg, rgba(10,16,34,0.88) 0%, rgba(10,16,34,0.62) 100%)',
          backdropFilter: isLightChrome ? 'none' : 'blur(14px)',
          color: panelPrimaryText,
        }}
      >
        {showMessagesHeading ? (
          <Typography
            id="chat-room-list-heading"
            variant="subtitle1"
            component="h2"
            fontWeight={700}
            sx={{ color: panelPrimaryText, mb: 1 }}
          >
            Messages
          </Typography>
        ) : (
          <Typography
            id="chat-room-list-heading"
            variant="subtitle2"
            component="h2"
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              p: 0,
              m: -1,
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            Conversations
          </Typography>
        )}
        <TextField
          size="small"
          fullWidth
          placeholder="Search messages"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          inputProps={{
            'aria-label': 'Search messages',
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  fontSize="small"
                  sx={{ opacity: 0.7, color: panelSecondaryText }}
                />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 1.35,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: isLightChrome
                ? alpha(theme.palette.common.black, 0.025)
                : 'rgba(255,255,255,0.035)',
              border: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.65 : 0.18)}`,
              boxShadow: 'none',
            },
            '& .MuiInputBase-root': {
              color: panelPrimaryText,
            },
            '& .MuiInputBase-input::placeholder': {
              color: panelSecondaryText,
              opacity: 1,
            },
          }}
        />
        {(onStartDm || onCreateGroup) && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              pt: 0.1,
            }}
          >
            {onStartDm && (
              <Button
                fullWidth
                variant="contained"
                onClick={onStartDm}
                startIcon={<AddCommentOutlinedIcon />}
                sx={{
                  justifyContent: 'center',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  px: 1.1,
                  py: 0.8,
                  ...(isLightChrome
                    ? {
                        color: theme.palette.primary.contrastText,
                        background: theme.palette.primary.main,
                        boxShadow: 'none',
                        '&:hover': {
                          background: theme.palette.primary.dark,
                        },
                      }
                    : {
                        color: 'white',
                        background:
                          'linear-gradient(180deg, rgba(39,63,122,0.96) 0%, rgba(19,31,62,0.98) 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                        '&:hover': {
                          background:
                            'linear-gradient(180deg, rgba(46,73,140,0.98) 0%, rgba(22,35,70,1) 100%)',
                        },
                      }),
                }}
              >
                New chat
              </Button>
            )}
            {onCreateGroup && (
              <Button
                fullWidth
                variant="outlined"
                onClick={onCreateGroup}
                startIcon={<GroupOutlinedIcon />}
                sx={{
                  justifyContent: 'center',
                  textTransform: 'none',
                  borderRadius: 1.5,
                  px: 1.1,
                  py: 0.8,
                  ...(isLightChrome
                    ? {
                        color: theme.palette.primary.main,
                        borderColor: alpha(theme.palette.primary.main, 0.45),
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.06,
                        ),
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.1,
                          ),
                        },
                      }
                    : {
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.16)',
                        backgroundColor: 'rgba(13, 18, 33, 0.82)',
                        '&:hover': {
                          borderColor: 'rgba(140,190,255,0.38)',
                          backgroundColor: 'rgba(18, 25, 46, 0.92)',
                        },
                      }),
                }}
              >
                New group
              </Button>
            )}
          </Stack>
        )}
      </Box>
      <List
        aria-labelledby="chat-room-list-heading"
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 0,
          px: 0,
          color: panelPrimaryText,
        }}
      >
        {loading ? (
          <ListItemButton disabled>
            <Typography variant="body2" color={panelSecondaryText}>
              Loading…
            </Typography>
          </ListItemButton>
        ) : rooms.length === 0 ? (
          <ListItemButton disabled>
            <Typography variant="body2" color={panelSecondaryText}>
              No conversations yet
            </Typography>
          </ListItemButton>
        ) : filteredRooms.length === 0 ? (
          <ListItemButton disabled>
            <Typography variant="body2" color={panelSecondaryText}>
              {searchQuery.trim()
                ? 'No matches for your search'
                : 'No conversations match this view'}
            </Typography>
          </ListItemButton>
        ) : (
          filteredRooms.map((room) => (
            <ListItemButton
              key={room.id}
              selected={roomId === room.id}
              onClick={() => navigate(`${base}/${room.id}`)}
              sx={{
                ...(roomId === room.id
                  ? {
                      bgcolor: isLightChrome
                        ? alpha(theme.palette.primary.main, 0.11)
                        : alpha(theme.palette.primary.main, 0.16),
                      boxShadow: `inset 3px 0 0 ${alpha(theme.palette.primary.main, 0.9)}`,
                    }
                  : {}),
                borderBottom: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.08 : 0.06)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 1,
                px: { xs: 1.1, sm: 1.25 },
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
                    bgcolor:
                      roomId === room.id
                        ? isLightChrome
                          ? alpha(theme.palette.primary.main, 0.14)
                          : alpha(theme.palette.primary.main, 0.2)
                        : isLightChrome
                          ? alpha(theme.palette.action.hover, 0.55)
                          : 'rgba(255,255,255,0.045)',
                  },
                },
                '&:focus-visible': {
                  outline: `2px solid ${alpha(theme.palette.primary.main, 0.45)}`,
                  outlineOffset: -2,
                },
              }}
            >
              <ProfileAvatar
                src={
                  room.room_type === 'dm'
                    ? (room.members?.find(
                        (member) => member.user_id !== currentUserId,
                      )?.profile?.avatar ?? undefined)
                    : undefined
                }
                alt={getChatRoomLabel(room, currentUserId)}
                size="small"
                sx={{ width: 40, height: 40, flexShrink: 0 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.75}
                  sx={{ minWidth: 0 }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={roomId === room.id ? 700 : 600}
                    noWrap
                    sx={{ color: panelPrimaryText, flex: 1, minWidth: 0 }}
                  >
                    {getChatRoomLabel(room, currentUserId)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: panelSecondaryText,
                      flexShrink: 0,
                      fontSize: '0.7rem',
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
                  {room.last_message_preview ||
                    (room.room_type === 'group'
                      ? `${room.members?.length ?? 0} members`
                      : 'No messages yet')}
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
                        room.is_favorite
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                    >
                      <IconButton
                        type="button"
                        aria-label={
                          room.is_favorite
                            ? 'Remove from favorites'
                            : 'Add to favorites'
                        }
                        data-testid={`chat-room-favorite-${room.id}`}
                        size="small"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          Promise.resolve(
                            onToggleFavorite(
                              room.id,
                              Boolean(room.is_favorite),
                            ),
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
                    </Tooltip>
                  )}
                  {onRemoveChat && (
                    <Tooltip title="Remove conversation">
                      <IconButton
                        aria-label="Remove conversation"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemoveTarget({
                            id: room.id,
                            label: getChatRoomLabel(room, currentUserId),
                          });
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
                    </Tooltip>
                  )}
                </Box>
              )}
            </ListItemButton>
          ))
        )}
      </List>
      {onRemoveChat && (
        <RemoveChatConfirmDialog
          open={Boolean(removeTarget)}
          roomLabel={removeTarget?.label ?? ''}
          onClose={() => setRemoveTarget(null)}
          onConfirm={() => {
            const id = removeTarget?.id;
            if (!id) return undefined;
            return Promise.resolve(onRemoveChat(id));
          }}
        />
      )}
    </Box>
  );
};
