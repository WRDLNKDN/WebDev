import DeleteIcon from '@mui/icons-material/Delete';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
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
import { GLASS_CARD } from '../../../theme/candyStyles';
import { compactGlassDangerIconButtonSx } from '../../../theme/iconActionStyles';

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
}: ChatRoomListProps) => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const [filter, setFilter] = useState<ChatRoomFilter>('all');
  const [sort, setSort] = useState<ChatRoomSort>('recent');
  const base = chatPathPrefix.replace(/\/$/, '');

  const visibleRooms = useMemo(
    () =>
      deriveVisibleChatRooms(rooms, {
        currentUserId,
        filter,
        sort,
      }),
    [currentUserId, filter, rooms, sort],
  );

  return (
    <Box
      sx={{
        width: { xs: '100%', md: 280 },
        minWidth: 0,
        borderRight: { xs: 'none', md: '1px solid rgba(255,255,255,0.1)' },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Messages
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <FormControl size="small" fullWidth>
            <InputLabel id="chat-room-filter-label">Filter</InputLabel>
            <Select
              labelId="chat-room-filter-label"
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
            <InputLabel id="chat-room-sort-label">Sort</InputLabel>
            <Select
              labelId="chat-room-sort-label"
              value={sort}
              label="Sort"
              onChange={(event) => setSort(event.target.value as ChatRoomSort)}
            >
              {CHAT_ROOM_SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        {(onStartDm || onCreateGroup) && (
          <Box
            sx={{
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 2,
              p: 1.25,
              background:
                'linear-gradient(180deg, rgba(80,120,255,0.12) 0%, rgba(8,12,24,0.28) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <Button
              fullWidth
              onClick={onStartDm}
              startIcon={<AddIcon />}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                mb: 1,
                px: 1.25,
                py: 1.1,
                borderRadius: 1.5,
                border: '1px solid rgba(120,170,255,0.2)',
                background:
                  'linear-gradient(180deg, rgba(31,44,86,0.9) 0%, rgba(11,18,37,0.92) 100%)',
                '&:hover': {
                  background:
                    'linear-gradient(180deg, rgba(37,52,100,0.96) 0%, rgba(14,22,44,0.98) 100%)',
                },
              }}
            >
              Start Conversation
            </Button>

            <Box sx={{ display: 'grid', gap: 1 }}>
              {onStartDm && (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={onStartDm}
                  startIcon={<AddCommentOutlinedIcon />}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.16)',
                    backgroundColor: 'rgba(13, 18, 33, 0.82)',
                    borderRadius: 1.5,
                    px: 1.25,
                    py: 0.95,
                    '&:hover': {
                      borderColor: 'rgba(140,190,255,0.38)',
                      backgroundColor: 'rgba(18, 25, 46, 0.92)',
                    },
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
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.16)',
                    backgroundColor: 'rgba(13, 18, 33, 0.82)',
                    borderRadius: 1.5,
                    px: 1.25,
                    py: 0.95,
                    '&:hover': {
                      borderColor: 'rgba(140,190,255,0.38)',
                      backgroundColor: 'rgba(18, 25, 46, 0.92)',
                    },
                  }}
                >
                  New group
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Box>
      <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
        {loading ? (
          <ListItemButton disabled>
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          </ListItemButton>
        ) : rooms.length === 0 ? (
          <ListItemButton disabled>
            <Typography variant="body2" color="text.secondary">
              No conversations yet
            </Typography>
          </ListItemButton>
        ) : visibleRooms.length === 0 ? (
          <ListItemButton disabled>
            <Typography variant="body2" color="text.secondary">
              No conversations match this view
            </Typography>
          </ListItemButton>
        ) : (
          visibleRooms.map((room) => (
            <ListItemButton
              key={room.id}
              selected={roomId === room.id}
              onClick={() => navigate(`${base}/${room.id}`)}
              sx={{
                ...(roomId === room.id ? GLASS_CARD : {}),
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
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
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {getChatRoomLabel(room, currentUserId)}
                  </Typography>
                  {room.is_favorite ? (
                    <StarIcon
                      sx={{ fontSize: 14, color: '#f5c451', flexShrink: 0 }}
                    />
                  ) : null}
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
                  {room.last_message_preview ||
                    (room.room_type === 'group'
                      ? `${room.members?.length ?? 0} members`
                      : '1:1')}
                </Typography>
              </Box>
              {onToggleFavorite && (
                <Tooltip
                  title={
                    room.is_favorite
                      ? 'Remove from favorites'
                      : 'Add to favorites'
                  }
                >
                  <IconButton
                    aria-label={
                      room.is_favorite
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                    data-testid={`chat-room-favorite-${room.id}`}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(room.id, Boolean(room.is_favorite));
                    }}
                    sx={{
                      color: room.is_favorite ? '#f5c451' : 'text.secondary',
                    }}
                  >
                    {room.is_favorite ? (
                      <StarIcon fontSize="small" />
                    ) : (
                      <StarBorderIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              )}
              {onRemoveChat && (
                <Tooltip title="Remove chat">
                  <IconButton
                    aria-label="Remove chat"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveChat(room.id);
                    }}
                    sx={{
                      ...compactGlassDangerIconButtonSx,
                      ml: 'auto',
                      flexShrink: 0,
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </ListItemButton>
          ))
        )}
      </List>
    </Box>
  );
};
