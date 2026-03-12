import DeleteIcon from '@mui/icons-material/Delete';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import type { ChatRoomWithMembers } from '../../../hooks/useChat';
import { GLASS_CARD } from '../../../theme/candyStyles';
import { compactGlassDangerIconButtonSx } from '../../../theme/iconActionStyles';

type ChatRoomListProps = {
  rooms: ChatRoomWithMembers[];
  loading: boolean;
  currentUserId?: string;
  onCreateGroup?: () => void;
  onStartDm?: () => void;
  onRemoveChat?: (roomId: string) => void;
  /** Base path for room links (e.g. /chat-full so room clicks stay on full chat page). Default /chat. */
  chatPathPrefix?: string;
};

const DEFAULT_CHAT_PREFIX = '/chat';

export const ChatRoomList = ({
  rooms,
  loading,
  currentUserId,
  onCreateGroup,
  onStartDm,
  onRemoveChat,
  chatPathPrefix = DEFAULT_CHAT_PREFIX,
}: ChatRoomListProps) => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const base = chatPathPrefix.replace(/\/$/, '');

  const getRoomLabel = (room: ChatRoomWithMembers) => {
    if (room.room_type === 'group' && room.name) return room.name;
    const other = room.members?.find((m) => m.user_id !== currentUserId);
    return other?.profile?.display_name || other?.profile?.handle || 'User';
  };

  return (
    <Box
      sx={{
        width: { xs: '100%', md: 280 },
        minWidth: 0,
        borderRight: { xs: 'none', md: '1px solid rgba(156,187,217,0.22)' },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(156,187,217,0.22)' }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Messages
        </Typography>
        {(onStartDm || onCreateGroup) && (
          <Box
            sx={{
              border: '1px solid rgba(156,187,217,0.28)',
              borderRadius: 2,
              p: 1.25,
              background:
                'linear-gradient(180deg, rgba(80,120,255,0.12) 0%, rgba(8,12,24,0.28) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(156,187,217,0.18)',
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
                    borderColor: 'rgba(156,187,217,0.32)',
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
                    borderColor: 'rgba(156,187,217,0.32)',
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
        ) : (
          rooms.map((room) => (
            <ListItemButton
              key={room.id}
              selected={roomId === room.id}
              onClick={() => navigate(`${base}/${room.id}`)}
              sx={{
                ...(roomId === room.id ? GLASS_CARD : {}),
                borderBottom: '1px solid rgba(56,132,210,0.14)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {getRoomLabel(room)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {room.room_type === 'group'
                    ? `${room.members?.length ?? 0} members`
                    : '1:1'}
                </Typography>
              </Box>
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
