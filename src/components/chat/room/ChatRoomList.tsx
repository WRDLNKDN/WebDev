import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  InputAdornment,
  List,
  ListItemButton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ChatRoomWithMembers } from '../../../hooks/useChat';
import {
  deriveVisibleChatRooms,
  getChatRoomLabel,
} from '../../../lib/chat/roomListState';
import { RemoveChatConfirmDialog } from '../dialogs/RemoveChatConfirmDialog';
import { ChatRoomRow } from './ChatRoomRow';

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

  const inboxMetaLabel =
    rooms.length === 0
      ? 'Ready for your first conversation'
      : `${rooms.length} conversation${rooms.length === 1 ? '' : 's'}`;

  const renderStatePanel = ({
    body,
    dataTestId,
    icon,
    title,
  }: {
    body: string;
    dataTestId: string;
    icon: ReactNode;
    title: string;
  }) => (
    <Box data-testid={dataTestId} sx={{ mt: 1, px: 0.25 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.4,
          px: 1.5,
          py: 1.6,
          borderRadius: 2.75,
          border: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.18 : 0.14)}`,
          bgcolor: isLightChrome
            ? alpha(theme.palette.background.paper, 0.9)
            : 'linear-gradient(180deg, rgba(15,24,43,0.92) 0%, rgba(11,17,31,0.9) 100%)',
          boxShadow: isLightChrome
            ? '0 10px 28px rgba(15,23,42,0.08)'
            : '0 16px 34px rgba(0,0,0,0.18)',
        }}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2.2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            color: isLightChrome
              ? theme.palette.primary.main
              : 'rgba(141,188,229,0.92)',
            bgcolor: isLightChrome
              ? alpha(theme.palette.primary.main, 0.12)
              : 'rgba(56,132,210,0.16)',
            border: `1px solid ${alpha(theme.palette.primary.main, isLightChrome ? 0.16 : 0.24)}`,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ color: panelPrimaryText, mb: 0.4, letterSpacing: '-0.01em' }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: panelSecondaryText,
              lineHeight: 1.58,
              maxWidth: 320,
            }}
          >
            {body}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          p: { xs: 1.05, sm: 1.15 },
          borderBottom: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.12 : 0.08)}`,
          background: isLightChrome
            ? alpha(theme.palette.background.paper, 0.94)
            : 'linear-gradient(180deg, rgba(10,16,34,0.92) 0%, rgba(10,16,34,0.74) 100%)',
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
          placeholder="Search conversations"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          inputProps={{
            'aria-label': 'Search conversations',
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
            mb: 0.95,
            '& .MuiOutlinedInput-root': {
              minHeight: 42,
              borderRadius: 2.4,
              bgcolor: isLightChrome
                ? alpha(theme.palette.common.black, 0.025)
                : 'rgba(255,255,255,0.035)',
              border: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.65 : 0.18)}`,
              boxShadow: 'none',
              '& input': {
                py: 1.1,
              },
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
            spacing={0.85}
            sx={{
              alignItems: 'stretch',
              pt: 0.05,
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
                  borderRadius: 1.9,
                  px: 1.2,
                  py: 0.9,
                  minHeight: 42,
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
                  fontWeight: 600,
                  borderRadius: 1.9,
                  px: 1.2,
                  py: 0.9,
                  minHeight: 42,
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
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 0.85, sm: 0.95 },
          pb: { xs: 0.9, sm: 1 },
          pt: 0.45,
          background: isLightChrome
            ? alpha(theme.palette.background.default, 0.4)
            : 'linear-gradient(180deg, rgba(7,12,24,0.5) 0%, rgba(7,12,24,0.2) 100%)',
          color: panelPrimaryText,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 0.55,
            py: 0.7,
            borderBottom: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.08 : 0.06)}`,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: panelSecondaryText,
              fontSize: '0.68rem',
              letterSpacing: '0.14em',
              fontWeight: 700,
            }}
          >
            Inbox
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: panelSecondaryText,
              fontWeight: 500,
            }}
          >
            {inboxMetaLabel}
          </Typography>
        </Stack>
        {loading ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 3,
            }}
          >
            <Typography variant="body2" color={panelSecondaryText}>
              Loading conversations...
            </Typography>
          </Box>
        ) : rooms.length === 0 ? (
          renderStatePanel({
            title: 'No conversations yet',
            body: 'Start a new chat or create a group to begin messaging.',
            icon: <ForumOutlinedIcon fontSize="small" />,
            dataTestId: 'chat-room-list-empty-state',
          })
        ) : filteredRooms.length === 0 ? (
          renderStatePanel({
            title: 'No matches found',
            body: searchQuery.trim()
              ? `Try a different search term for "${searchQuery.trim()}".`
              : 'Try another filter or search term to find the right conversation.',
            icon: <SearchIcon fontSize="small" />,
            dataTestId: 'chat-room-list-no-matches-state',
          })
        ) : (
          <List
            aria-labelledby="chat-room-list-heading"
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              py: 0,
              px: 0,
              mt: 0.75,
              borderRadius: 2.75,
              border: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.1 : 0.08)}`,
              bgcolor: isLightChrome
                ? alpha(theme.palette.background.paper, 0.64)
                : 'rgba(9,14,25,0.52)',
            }}
          >
            {filteredRooms.map((room) => (
              <ListItemButton
                key={room.id}
                selected={roomId === room.id}
                onClick={() => navigate(`${base}/${room.id}`)}
                sx={{
                  ...(roomId === room.id
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
                  py: { xs: 0.72, sm: 0.82 },
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
                      bgcolor:
                        roomId === room.id
                          ? isLightChrome
                            ? alpha(theme.palette.primary.main, 0.17)
                            : alpha(theme.palette.primary.main, 0.26)
                          : isLightChrome
                            ? alpha(theme.palette.action.hover, 0.45)
                            : 'rgba(255,255,255,0.055)',
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
                      : (createNormalizedGroupImageAsset(room)?.displayUrl ??
                        room.image_url ??
                        undefined)
                  }
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
                      fontWeight={roomId === room.id ? 700 : 600}
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
                    {room.last_message_preview ||
                      (room.room_type === 'group'
                        ? room.description ||
                          `${room.members?.length ?? 0} members`
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
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                )}
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
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
