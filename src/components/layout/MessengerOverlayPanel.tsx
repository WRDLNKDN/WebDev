import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import GroupsIcon from '@mui/icons-material/Groups';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import {
  Avatar,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  InputAdornment,
  List,
  ListItemButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import {
  CHAT_ROOM_FILTER_OPTIONS,
  CHAT_ROOM_SORT_OPTIONS,
  deriveVisibleChatRooms,
  type ChatRoomFilter,
  type ChatRoomSort,
} from '../../lib/chat/roomListState';
import { RemoveChatConfirmDialog } from '../chat/dialogs/RemoveChatConfirmDialog';
import { getGlassCard } from '../../theme/candyStyles';
import {
  CHAT_FAVORITE_ACTIVE_BUTTON_SX,
  CHAT_FAVORITE_ICON_BUTTON_STAR_SX,
  CHAT_FAVORITE_IDLE_BUTTON_SX,
  CHAT_FAVORITE_ROW_BADGE_SX,
} from '../../theme/chatFavoriteStyles';

const DM_ICON_COLOR = '#3884D2';
const GROUP_ICON_COLOR = '#4DD166';

type Props = {
  mobile: boolean;
  drawerTopDesktop: number;
  drawerTopMobile: number;
  drawerWidth: number;
  avatarUrl: string | null;
  currentUserId: string;
  session: Session;
  menuButtonClick: (anchor: HTMLElement) => void;
  onStartDm: () => void;
  onCreateGroup: () => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filter: ChatRoomFilter;
  setFilter: (value: ChatRoomFilter) => void;
  sort: ChatRoomSort;
  setSort: (value: ChatRoomSort) => void;
  roomsLoading: boolean;
  rooms: ChatRoomWithMembers[];
  getRoomLabel: (room: ChatRoomWithMembers) => string;
  onOpenRoom: (roomId: string) => void;
  onRemoveRoom: (roomId: string) => void | Promise<void>;
  onToggleFavorite: (roomId: string, isFavorite: boolean) => void;
  onBackdropClick: () => void;
  onClose: () => void;
};

const MessengerOverlayEmptyState = ({
  onStartDm,
  onCreateGroup,
}: {
  onStartDm: () => void;
  onCreateGroup: () => void;
}) => {
  return (
    <Box
      data-testid="messenger-empty-state"
      sx={{
        flex: 1,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 4,
        textAlign: 'center',
      }}
    >
      <ChatBubbleOutlineOutlinedIcon
        sx={{
          fontSize: 52,
          color: 'rgba(141,188,229,0.35)',
          mb: 2,
        }}
        aria-hidden
      />
      <Typography
        component="h2"
        variant="subtitle1"
        fontWeight={700}
        sx={{ mb: 0.75, letterSpacing: 0.02 }}
      >
        No conversations yet
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2.5, maxWidth: 300, lineHeight: 1.5 }}
      >
        Start a message with someone you know, or spin up a group for your crew.
      </Typography>
      <Button
        variant="contained"
        size="medium"
        onClick={onStartDm}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          minWidth: 200,
          borderRadius: 2,
          boxShadow: '0 4px 14px rgba(56,132,210,0.25)',
        }}
      >
        New message
      </Button>
      <Button
        variant="text"
        size="medium"
        onClick={onCreateGroup}
        sx={{
          mt: 0.75,
          textTransform: 'none',
          fontWeight: 600,
          color: 'text.secondary',
          '&:hover': {
            color: 'primary.light',
            bgcolor: 'rgba(56,132,210,0.08)',
          },
        }}
      >
        Create group
      </Button>
    </Box>
  );
};

const MessengerOverlayNoMatchesState = () => {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 4,
        textAlign: 'center',
      }}
    >
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.75 }}>
        No matches
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
        Try another filter or search term.
      </Typography>
    </Box>
  );
};

export const MessengerOverlayPanel = ({
  mobile,
  drawerTopDesktop,
  drawerTopMobile,
  drawerWidth,
  avatarUrl,
  currentUserId,
  session,
  menuButtonClick,
  onStartDm,
  onCreateGroup,
  searchQuery,
  setSearchQuery,
  filter,
  setFilter,
  sort,
  setSort,
  roomsLoading,
  rooms,
  getRoomLabel,
  onOpenRoom,
  onRemoveRoom,
  onToggleFavorite,
  onBackdropClick,
  onClose,
}: Props) => {
  const theme = useTheme();
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const headerIconSx = useMemo(
    () => ({
      color: alpha(theme.palette.text.primary, 0.72),
      boxShadow: 'none',
      bgcolor: 'transparent',
      '&:hover': {
        color: theme.palette.text.primary,
        bgcolor: theme.palette.action.hover,
      },
    }),
    [theme],
  );

  const filteredRooms = deriveVisibleChatRooms(rooms, {
    currentUserId,
    filter,
    sort,
    searchQuery,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const headerActions = (
    <>
      <Tooltip title="More options">
        <IconButton
          aria-label="More options"
          onClick={(e) => menuButtonClick(e.currentTarget)}
          size="small"
          sx={headerIconSx}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Close">
        <IconButton
          aria-label="Dismiss messaging panel"
          onClick={onClose}
          size="small"
          sx={headerIconSx}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <>
      <Box
        aria-hidden
        onClick={onBackdropClick}
        data-testid="messenger-overlay-backdrop"
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: alpha(
            theme.palette.common.black,
            theme.palette.mode === 'light' ? 0.28 : 0.35,
          ),
          zIndex: 1299,
          animation: 'fadeIn 0.25s ease-out',
          '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
        }}
      />

      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby="messenger-overlay-title"
        data-testid="messenger-overlay-panel"
        onClick={(e) => e.stopPropagation()}
        sx={{
          ...getGlassCard(theme),
          position: 'fixed',
          right: 0,
          top: mobile ? drawerTopMobile : drawerTopDesktop,
          width: mobile ? '100%' : drawerWidth,
          height: mobile
            ? `calc(100vh - ${drawerTopMobile}px)`
            : `calc(100vh - ${drawerTopDesktop}px)`,
          zIndex: 1300,
          borderLeft: `1px solid ${alpha(
            theme.palette.divider,
            theme.palette.mode === 'light' ? 0.4 : 0.12,
          )}`,
          borderRadius: '10px 0 0 10px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'messengerSlideIn 0.35s cubic-bezier(0.32, 0, 0.37, 1)',
          '@keyframes messengerSlideIn': {
            from: { transform: 'translateX(100%)' },
            to: { transform: 'translateX(0)' },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Header: avatar + title + menu/close (New message: empty state + ⋮ menu) */}
          <Box
            sx={{
              px: 1.5,
              py: 1.25,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Avatar
                src={avatarUrl ?? undefined}
                sx={{ width: 36, height: 36 }}
              >
                {session?.user?.user_metadata?.name?.[0] ?? '?'}
              </Avatar>
              <Typography
                id="messenger-overlay-title"
                variant="subtitle1"
                fontWeight={700}
                sx={{ flex: 1, minWidth: 0, letterSpacing: 0.02 }}
              >
                Messaging
              </Typography>
              {headerActions}
            </Stack>
          </Box>

          <TextField
            size="small"
            placeholder="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ mr: 0 }}>
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                </InputAdornment>
              ),
              sx: {
                py: 0.25,
                pl: 1,
                pr: 1,
                fontSize: '0.875rem',
                '& input': { py: 0.65 },
              },
            }}
            sx={{
              mx: 1.5,
              mt: 1.1,
              mb: 1,
              '& .MuiOutlinedInput-root': {
                minHeight: 38,
                bgcolor:
                  theme.palette.mode === 'light'
                    ? alpha(theme.palette.common.black, 0.04)
                    : 'rgba(255,255,255,0.04)',
                borderRadius: 2,
                '& fieldset': {
                  borderColor: alpha(theme.palette.primary.light, 0.22),
                },
                '&:hover fieldset': {
                  borderColor: alpha(theme.palette.primary.light, 0.38),
                },
              },
            }}
          />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ px: 1.5, pb: 1, flexShrink: 0 }}
          >
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                overflowX: 'auto',
                flex: { sm: 1 },
                minWidth: 0,
                py: 0.25,
                mx: { xs: -0.25, sm: 0 },
                px: { xs: 0.25, sm: 0 },
                '&::-webkit-scrollbar': { height: 3 },
              }}
            >
              {CHAT_ROOM_FILTER_OPTIONS.map((option) => {
                const selected = filter === option.value;
                return (
                  <Chip
                    key={option.value}
                    label={option.label}
                    size="small"
                    onClick={() => setFilter(option.value)}
                    aria-pressed={selected}
                    variant={selected ? 'filled' : 'outlined'}
                    color={selected ? 'primary' : 'default'}
                    sx={{
                      flexShrink: 0,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderColor: alpha(theme.palette.primary.light, 0.28),
                      ...(selected
                        ? {}
                        : {
                            bgcolor:
                              theme.palette.mode === 'light'
                                ? alpha(theme.palette.common.black, 0.04)
                                : 'rgba(255,255,255,0.04)',
                            color: 'text.secondary',
                          }),
                    }}
                  />
                );
              })}
            </Stack>
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: '100%', sm: 148 },
                maxWidth: { sm: 180 },
                flexShrink: 0,
              }}
            >
              <InputLabel id="messenger-sort-label">Sort</InputLabel>
              <Select
                labelId="messenger-sort-label"
                value={sort}
                label="Sort"
                onChange={(event) =>
                  setSort(event.target.value as ChatRoomSort)
                }
                sx={{
                  borderRadius: 2,
                  '& .MuiSelect-select': { py: 0.65, fontSize: '0.8125rem' },
                }}
              >
                {CHAT_ROOM_SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {roomsLoading ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 6,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Loading…
                </Typography>
              </Box>
            ) : rooms.length === 0 ? (
              <MessengerOverlayEmptyState
                onStartDm={onStartDm}
                onCreateGroup={onCreateGroup}
              />
            ) : filteredRooms.length === 0 ? (
              <MessengerOverlayNoMatchesState />
            ) : (
              <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                {filteredRooms.map((r) => (
                  <ListItemButton
                    key={r.id}
                    onClick={() => onOpenRoom(r.id)}
                    sx={{
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                      display: 'flex',
                      alignItems: 'center',
                      py: 1.35,
                      px: 1.35,
                      '& .messenger-row-actions': {
                        opacity: { xs: 1, md: 0 },
                        transition: 'opacity 140ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        ml: 'auto',
                        flexShrink: 0,
                        gap: 0.15,
                      },
                      '@media (hover: hover)': {
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.06),
                        },
                        '&:hover .messenger-row-actions, &:focus-within .messenger-row-actions':
                          {
                            opacity: 1,
                          },
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        {r.room_type === 'group' ? (
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
                        <Typography variant="body2" fontWeight={600}>
                          {getRoomLabel(r)}
                        </Typography>
                        {r.is_favorite ? (
                          <StarIcon
                            aria-hidden
                            data-testid={`messenger-overlay-favorite-badge-${r.id}`}
                            sx={CHAT_FAVORITE_ROW_BADGE_SX}
                          />
                        ) : null}
                        {(r.unread_count ?? 0) > 0 && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{
                              px: 0.75,
                              py: 0.125,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                            }}
                          >
                            {r.unread_count! > 99 ? '99+' : r.unread_count}
                          </Typography>
                        )}
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
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
                        {r.last_message_preview ??
                          (r.room_type === 'group'
                            ? `${r.members?.length ?? 0} members`
                            : '1:1')}
                      </Typography>
                    </Box>
                    <Box className="messenger-row-actions">
                      <IconButton
                        type="button"
                        aria-label={
                          r.is_favorite
                            ? 'Remove from favorites'
                            : 'Add to favorites'
                        }
                        data-testid={`messenger-overlay-favorite-${r.id}`}
                        size="small"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          Promise.resolve(
                            onToggleFavorite(r.id, Boolean(r.is_favorite)),
                          ).catch(() => {});
                        }}
                        sx={{
                          borderRadius: 1.25,
                          minWidth: 36,
                          minHeight: 36,
                          transition:
                            'color 120ms ease, background-color 120ms ease, border-color 120ms ease, opacity 120ms ease',
                          ...(r.is_favorite
                            ? CHAT_FAVORITE_ACTIVE_BUTTON_SX
                            : CHAT_FAVORITE_IDLE_BUTTON_SX),
                        }}
                      >
                        {r.is_favorite ? (
                          <StarIcon
                            sx={CHAT_FAVORITE_ICON_BUTTON_STAR_SX}
                            data-testid={`messenger-overlay-favorite-icon-filled-${r.id}`}
                          />
                        ) : (
                          <StarBorderIcon
                            fontSize="small"
                            data-testid={`messenger-overlay-favorite-icon-outline-${r.id}`}
                          />
                        )}
                      </IconButton>
                      <Tooltip title="Remove conversation">
                        <IconButton
                          aria-label="Remove conversation"
                          data-testid={`messenger-overlay-remove-${r.id}`}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemoveTarget({
                              id: r.id,
                              label: getRoomLabel(r),
                            });
                          }}
                          sx={{
                            ...headerIconSx,
                            minWidth: 34,
                            minHeight: 34,
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Box>
      <RemoveChatConfirmDialog
        open={Boolean(removeTarget)}
        roomLabel={removeTarget?.label ?? ''}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          const id = removeTarget?.id;
          if (!id) return undefined;
          return Promise.resolve(onRemoveRoom(id));
        }}
      />
    </>
  );
};
