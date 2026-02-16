import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import { GLASS_CARD } from '../../theme/candyStyles';

type ChatRoomListProps = {
  rooms: ChatRoomWithMembers[];
  loading: boolean;
  currentUserId?: string;
  onCreateGroup?: () => void;
  onStartDm?: () => void;
  onRemoveChat?: (roomId: string) => void;
};

export const ChatRoomList = ({
  rooms,
  loading,
  currentUserId,
  onCreateGroup,
  onStartDm,
  onRemoveChat,
}: ChatRoomListProps) => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();

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
        borderRight: { xs: 'none', md: '1px solid rgba(255,255,255,0.1)' },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Messages
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {onStartDm && (
            <Button
              size="small"
              variant="outlined"
              onClick={onStartDm}
              sx={{ textTransform: 'none' }}
            >
              New chat
            </Button>
          )}
          {onCreateGroup && (
            <Button
              size="small"
              variant="outlined"
              onClick={onCreateGroup}
              sx={{ textTransform: 'none' }}
            >
              New group
            </Button>
          )}
        </Box>
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
              onClick={() => navigate(`/chat/${room.id}`)}
              sx={{
                ...(roomId === room.id ? GLASS_CARD : {}),
                borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                <IconButton
                  aria-label="Remove chat"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveChat(room.id);
                  }}
                  sx={{ color: 'text.secondary', ml: 0.5 }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </ListItemButton>
          ))
        )}
      </List>
    </Box>
  );
};
