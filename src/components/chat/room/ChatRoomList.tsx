import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
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
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
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
          p: { xs: 1, sm: 1.1 },
          borderBottom: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.1 : 0.06)}`,
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
            mb: 1.1,
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
            <ChatRoomRow
              key={room.id}
              room={room}
              currentUserId={currentUserId}
              activeRoomId={roomId}
              base={base}
              isLightChrome={isLightChrome}
              theme={theme}
              panelPrimaryText={panelPrimaryText}
              panelSecondaryText={panelSecondaryText}
              onToggleFavorite={onToggleFavorite}
              onRemoveChat={onRemoveChat}
              onRequestRemove={(id, label) => setRemoveTarget({ id, label })}
            />
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
