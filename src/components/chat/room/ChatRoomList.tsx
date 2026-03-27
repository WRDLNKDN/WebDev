import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import CloseIcon from '@mui/icons-material/Close';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useId, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ChatRoomWithMembers } from '../../../hooks/useChat';
import {
  CHAT_ROOM_FILTER_OPTIONS,
  CHAT_ROOM_SORT_OPTIONS,
  deriveVisibleChatRooms,
  getChatRoomLabel,
  type ChatRoomFilter,
  type ChatRoomSort,
} from '../../../lib/chat/roomListState';
import { RemoveChatConfirmDialog } from '../dialogs/RemoveChatConfirmDialog';
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
const DM_ICON_COLOR = '#3884D2';
const GROUP_ICON_COLOR = '#4DD166';
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
  const [filter, setFilter] = useState<ChatRoomFilter>('all');
  const [sort, setSort] = useState<ChatRoomSort>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMenuAnchor, setViewMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const viewMenuId = useId();
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
        filter,
        sort,
      }),
    [currentUserId, filter, rooms, sort],
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
          p: { xs: 1.35, sm: 1.65 },
          borderBottom: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.14 : 0.08)}`,
          background: isLightChrome
            ? alpha(theme.palette.background.paper, 0.92)
            : 'linear-gradient(180deg, rgba(10,16,34,0.88) 0%, rgba(10,16,34,0.62) 100%)',
          backdropFilter: isLightChrome ? 'none' : 'blur(14px)',
          color: panelPrimaryText,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.25 }}
        >
          {showMessagesHeading ? (
            <Typography
              id="chat-room-list-heading"
              variant="subtitle1"
              component="h2"
              fontWeight={700}
              sx={{ color: panelPrimaryText }}
            >
              Messages
            </Typography>
          ) : (
            <>
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
              <Box sx={{ flex: 1 }} />
            </>
          )}
          <Tooltip title="Filter & sort">
            <IconButton
              size="small"
              aria-label="Filter and sort conversations"
              aria-expanded={Boolean(viewMenuAnchor)}
              aria-controls={viewMenuAnchor ? viewMenuId : undefined}
              onClick={(e) => setViewMenuAnchor(e.currentTarget)}
              sx={{
                color: panelSecondaryText,
                '&:hover': {
                  bgcolor: isLightChrome
                    ? alpha(theme.palette.primary.main, 0.06)
                    : 'rgba(255,255,255,0.06)',
                },
              }}
            >
              <TuneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <TextField
          size="small"
          fullWidth
          placeholder="Search"
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
            mb: 1.35,
            '& .MuiInputBase-root': {
              color: panelPrimaryText,
            },
            '& .MuiInputBase-input::placeholder': {
              color: panelSecondaryText,
              opacity: 1,
            },
          }}
        />
        <Popover
          id={viewMenuId}
          open={Boolean(viewMenuAnchor)}
          anchorEl={viewMenuAnchor}
          onClose={() => setViewMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: { p: 2, minWidth: 260 },
            },
          }}
        >
          <Stack spacing={1.5} data-testid="chat-room-list-controls">
            <FormControl size="small" fullWidth>
              <InputLabel id="chat-room-filter-label">Filter</InputLabel>
              <Select
                labelId="chat-room-filter-label"
                value={filter}
                label="Filter"
                onChange={(event) =>
                  setFilter(event.target.value as ChatRoomFilter)
                }
                sx={
                  isLightChrome
                    ? undefined
                    : {
                        color: panelPrimaryText,
                      }
                }
              >
                {CHAT_ROOM_FILTER_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel id="chat-room-sort-label">Sort</InputLabel>
              <Select
                labelId="chat-room-sort-label"
                value={sort}
                label="Sort"
                onChange={(event) =>
                  setSort(event.target.value as ChatRoomSort)
                }
                sx={
                  isLightChrome
                    ? undefined
                    : {
                        color: panelPrimaryText,
                      }
                }
              >
                {CHAT_ROOM_SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Popover>
        {(onStartDm || onCreateGroup) && (
          <Stack
            direction={{ xs: 'column', sm: 'row', md: 'column', lg: 'row' }}
            spacing={1}
            sx={{
              pt: 0.25,
            }}
          >
            {onStartDm && (
              <Button
                fullWidth
                variant="contained"
                onClick={onStartDm}
                startIcon={<AddCommentOutlinedIcon />}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  px: 1.35,
                  py: 0.95,
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
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  borderRadius: 1.5,
                  px: 1.25,
                  py: 0.95,
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
          px: 0.5,
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
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.primary.main, 0.14),
                    }
                  : {}),
                borderBottom: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.08 : 0.06)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                py: 1.35,
                px: { xs: 1.15, sm: 1.35 },
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
                          ? alpha(theme.palette.primary.main, 0.12)
                          : alpha(theme.palette.primary.main, 0.18)
                        : isLightChrome
                          ? alpha(theme.palette.action.hover, 0.5)
                          : 'rgba(255,255,255,0.04)',
                  },
                },
                '&:focus-visible': {
                  outline: `2px solid ${alpha(theme.palette.primary.main, 0.45)}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  {room.room_type === 'group' ? (
                    <GroupsIcon
                      aria-hidden
                      sx={{
                        fontSize: 18,
                        color: GROUP_ICON_COLOR,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <PersonIcon
                      aria-hidden
                      sx={{
                        fontSize: 18,
                        color: DM_ICON_COLOR,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    noWrap
                    sx={{ color: panelPrimaryText }}
                  >
                    {getChatRoomLabel(room, currentUserId)}
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
                    mt: 0.15,
                    lineHeight: 1.35,
                    opacity: 0.92,
                  }}
                >
                  {room.last_message_preview ||
                    (room.room_type === 'group'
                      ? `${room.members?.length ?? 0} members`
                      : '1:1')}
                </Typography>
              </Box>
              {(onToggleFavorite || onRemoveChat) && (
                <Box
                  className="chat-room-row-actions"
                  sx={{
                    ml: 'auto',
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
                          minWidth: 36,
                          minHeight: 36,
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
                          minWidth: 34,
                          minHeight: 34,
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
