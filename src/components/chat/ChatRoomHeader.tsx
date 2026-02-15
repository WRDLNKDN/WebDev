import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import BlockIcon from '@mui/icons-material/Block';
import EditIcon from '@mui/icons-material/Edit';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import LogoutIcon from '@mui/icons-material/Logout';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import { OnlineIndicator } from './OnlineIndicator';

type ChatRoomHeaderProps = {
  room: ChatRoomWithMembers | null;
  currentUserId: string;
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
  isRoomAdmin: boolean;
  onLeave: () => Promise<void>;
  onBlock: () => void;
  onInvite: () => void;
  onRename: () => void;
  onManageMembers: () => void;
  /** When provided, used instead of navigate('/chat') for Back button */
  onBack?: () => void;
  /** When true, show X icon instead of Back button (for popover) */
  closeIcon?: boolean;
  /** When provided, opens this room in a new window (LinkedIn-style pop out) */
  onPopOut?: () => void;
};

export const ChatRoomHeader = ({
  room,
  currentUserId,
  onlineUsers,
  typingUsers,
  isRoomAdmin,
  onLeave,
  onBlock,
  onInvite,
  onRename,
  onManageMembers,
  onBack,
  closeIcon,
  onPopOut,
}: ChatRoomHeaderProps) => {
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const otherMember = room?.members?.find((m) => m.user_id !== currentUserId);
  const otherUserId = otherMember?.user_id;
  const displayName =
    room?.room_type === 'group'
      ? room?.name
      : otherMember?.profile?.display_name ||
        otherMember?.profile?.handle ||
        'Chat';

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {closeIcon ? (
        <IconButton
          onClick={onBack}
          aria-label="Close"
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      ) : (
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={onBack ?? (() => navigate('/chat'))}
          sx={{ color: 'white' }}
        >
          Back
        </Button>
      )}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="h6">{displayName}</Typography>
        {room?.room_type === 'dm' && otherUserId && (
          <OnlineIndicator
            otherUserId={otherUserId}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
          />
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {onPopOut && (
          <IconButton
            onClick={onPopOut}
            aria-label="Open in new window"
            sx={{ color: 'rgba(255,255,255,0.7)' }}
            title="Pop out chat"
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        )}
        {room?.room_type === 'dm' && otherUserId && (
          <>
            <IconButton
              onClick={() => void onLeave()}
              aria-label="Leave conversation"
              sx={{ color: 'rgba(255,255,255,0.7)' }}
              title="Remove chat"
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={onBlock}
              aria-label="Block user"
              sx={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <BlockIcon fontSize="small" />
            </IconButton>
          </>
        )}
        {room?.room_type === 'group' && (
          <>
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-label="Room options"
              sx={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              slotProps={{
                root: { sx: { zIndex: 1500 } },
                paper: { sx: { zIndex: 1500 } },
              }}
            >
              {isRoomAdmin && (
                <MenuItem
                  onClick={() => {
                    onInvite();
                    setMenuAnchor(null);
                  }}
                >
                  <ListItemIcon>
                    <PersonAddIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Invite members</ListItemText>
                </MenuItem>
              )}
              {isRoomAdmin && (
                <MenuItem
                  onClick={() => {
                    onRename();
                    setMenuAnchor(null);
                  }}
                >
                  <ListItemIcon>
                    <EditIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Rename group</ListItemText>
                </MenuItem>
              )}
              {isRoomAdmin && (
                <MenuItem
                  onClick={() => {
                    onManageMembers();
                    setMenuAnchor(null);
                  }}
                >
                  <ListItemIcon>
                    <GroupAddIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Manage members</ListItemText>
                </MenuItem>
              )}
              <MenuItem
                onClick={() => {
                  void onLeave();
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Leave group</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
    </Box>
  );
};
