import DeleteIcon from '@mui/icons-material/Delete';
import AddCommentIcon from '@mui/icons-material/AddComment';
import CloseIcon from '@mui/icons-material/Close';
import GroupsIcon from '@mui/icons-material/Groups';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import {
  Avatar,
  Box,
  FormControl,
  IconButton,
  InputLabel,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import {
  CHAT_ROOM_FILTER_OPTIONS,
  CHAT_ROOM_SORT_OPTIONS,
  deriveVisibleChatRooms,
  type ChatRoomFilter,
  type ChatRoomSort,
} from '../../lib/chat/roomListState';
import { GLASS_CARD } from '../../theme/candyStyles';
import { compactGlassDangerIconButtonSx } from '../../theme/iconActionStyles';

const DM_ICON_COLOR = '#3884D2';
const GROUP_ICON_COLOR = '#4DD166';
const FAVORITE_ACTIVE_SX = {
  color: '#f5c451',
  bgcolor: 'rgba(245,196,81,0.14)',
  border: '1px solid rgba(245,196,81,0.28)',
  boxShadow: '0 0 0 1px rgba(245,196,81,0.08) inset',
  '&:hover': {
    bgcolor: 'rgba(245,196,81,0.2)',
  },
} as const;
const FAVORITE_IDLE_SX = {
  color: 'text.secondary',
  border: '1px solid transparent',
  '&:hover': {
    color: '#f5c451',
    bgcolor: 'rgba(245,196,81,0.08)',
  },
} as const;

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
  onRemoveChat: (e: React.MouseEvent, roomId: string) => void;
  onToggleFavorite: (roomId: string, isFavorite: boolean) => void;
  onBackdropClick: () => void;
  onClose: () => void;
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
  onRemoveChat,
  onToggleFavorite,
  onBackdropClick,
  onClose,
}: Props) => {
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

  return (
    <>
      <Box
        aria-hidden
        onClick={onBackdropClick}
        data-testid="messenger-overlay-backdrop"
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0,0,0,0.35)',
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
          ...GLASS_CARD,
          position: 'fixed',
          right: 0,
          top: mobile ? drawerTopMobile : drawerTopDesktop,
          width: mobile ? '100%' : drawerWidth,
          height: mobile
            ? `calc(100vh - ${drawerTopMobile}px)`
            : `calc(100vh - ${drawerTopDesktop}px)`,
          zIndex: 1300,
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '8px 0 0 8px',
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
          <Box
            sx={{
              p: 1.5,
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Avatar src={avatarUrl ?? undefined} sx={{ width: 36, height: 36 }}>
              {session?.user?.user_metadata?.name?.[0] ?? '?'}
            </Avatar>
            <Typography
              id="messenger-overlay-title"
              variant="subtitle1"
              fontWeight={600}
              sx={{ flex: 1 }}
            >
              Messaging
            </Typography>
            <IconButton
              aria-label="Close messages"
              onClick={onClose}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="Messaging options"
              onClick={(e) => menuButtonClick(e.currentTarget)}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="New message"
              onClick={onStartDm}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <AddCommentIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="Create group"
              onClick={onCreateGroup}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <GroupAddIcon fontSize="small" />
            </IconButton>
          </Box>

          <TextField
            size="small"
            placeholder="Search messages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ mr: 0 }}>
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                </InputAdornment>
              ),
              sx: {
                py: 0.5,
                pl: 1,
                pr: 1,
                fontSize: '0.875rem',
                '& input': { py: 0.5 },
              },
            }}
            sx={{
              m: 1,
              mt: 0.5,
              '& .MuiOutlinedInput-root': {
                minHeight: 36,
                bgcolor: 'action.hover',
                borderRadius: 1,
                '& fieldset': { borderColor: 'transparent' },
              },
            }}
          />

          <Stack direction="row" spacing={1} sx={{ px: 1, pb: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="messenger-filter-label">Filter</InputLabel>
              <Select
                labelId="messenger-filter-label"
                value={filter}
                label="Filter"
                onChange={(event) =>
                  setFilter(event.target.value as ChatRoomFilter)
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
              <InputLabel id="messenger-sort-label">Sort</InputLabel>
              <Select
                labelId="messenger-sort-label"
                value={sort}
                label="Sort"
                onChange={(event) =>
                  setSort(event.target.value as ChatRoomSort)
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

          <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
            {roomsLoading ? (
              <ListItemButton disabled>
                <Typography variant="body2" color="text.secondary">
                  Loading...
                </Typography>
              </ListItemButton>
            ) : rooms.length === 0 ? (
              <ListItemButton disabled>
                <ListItemText
                  primary="No conversations yet"
                  secondary="Start a new chat or create a group"
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ) : (
              (() => {
                if (filteredRooms.length === 0) {
                  return (
                    <ListItemButton disabled>
                      <ListItemText
                        primary="No matches"
                        secondary="Try a different filter, sort, or search term"
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItemButton>
                  );
                }

                return filteredRooms.map((r) => (
                  <ListItemButton
                    key={r.id}
                    onClick={() => onOpenRoom(r.id)}
                    sx={{
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
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
                            sx={{
                              fontSize: 14,
                              color: '#f5c451',
                              flexShrink: 0,
                            }}
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
                        }}
                      >
                        {r.last_message_preview ??
                          (r.room_type === 'group'
                            ? `${r.members?.length ?? 0} members`
                            : '1:1')}
                      </Typography>
                    </Box>
                    <IconButton
                      aria-label={
                        r.is_favorite
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                      data-testid={`messenger-overlay-favorite-${r.id}`}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(r.id, Boolean(r.is_favorite));
                      }}
                      sx={{
                        borderRadius: 1.25,
                        transition:
                          'color 120ms ease, background-color 120ms ease, border-color 120ms ease',
                        ...(r.is_favorite
                          ? FAVORITE_ACTIVE_SX
                          : FAVORITE_IDLE_SX),
                        ml: 0.25,
                      }}
                    >
                      {r.is_favorite ? (
                        <StarIcon
                          fontSize="small"
                          data-testid={`messenger-overlay-favorite-icon-filled-${r.id}`}
                        />
                      ) : (
                        <StarBorderIcon
                          fontSize="small"
                          data-testid={`messenger-overlay-favorite-icon-outline-${r.id}`}
                        />
                      )}
                    </IconButton>
                    <IconButton
                      aria-label="Remove chat"
                      data-testid={`messenger-overlay-remove-${r.id}`}
                      size="small"
                      onClick={(e) => onRemoveChat(e, r.id)}
                      sx={{
                        ...compactGlassDangerIconButtonSx,
                        ml: 'auto',
                        flexShrink: 0,
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                ));
              })()
            )}
          </List>
        </Box>
      </Box>
    </>
  );
};
