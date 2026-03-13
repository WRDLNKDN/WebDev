import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import BlockIcon from '@mui/icons-material/Block';
import EditIcon from '@mui/icons-material/Edit';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import LogoutIcon from '@mui/icons-material/Logout';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import {
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';
import type { ChatRoomWithMembers } from '../../../hooks/useChat';
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
  /** When provided, used instead of navigate('/chat-full') for Back button */
  onBack?: () => void;
  /** When true, show X icon instead of Back button (for popover) */
  closeIcon?: boolean;
  /** When provided, opens this room in a new window (LinkedIn-style pop out) */
  onPopOut?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
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
  isFavorite,
  onToggleFavorite,
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

  const avatarUrl =
    room?.room_type === 'dm'
      ? (otherMember?.profile?.avatar ?? undefined)
      : undefined;
  const avatarAlt = displayName || 'Chat';

  const menuItems = useMemo(() => {
    if (room?.room_type === 'dm') {
      return [
        <MenuItem
          key="leave-dm"
          onClick={() => {
            void onLeave();
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Leave conversation</ListItemText>
        </MenuItem>,
        <MenuItem
          key="block"
          onClick={() => {
            onBlock();
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <BlockIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Block</ListItemText>
        </MenuItem>,
      ];
    }
    if (room?.room_type === 'group') {
      return [
        ...(isRoomAdmin
          ? [
              <MenuItem
                key="invite"
                onClick={() => {
                  onInvite();
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon>
                  <PersonAddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Invite members</ListItemText>
              </MenuItem>,
              <MenuItem
                key="rename"
                onClick={() => {
                  onRename();
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Rename group</ListItemText>
              </MenuItem>,
              <MenuItem
                key="manage"
                onClick={() => {
                  onManageMembers();
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon>
                  <GroupAddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Manage members</ListItemText>
              </MenuItem>,
            ]
          : []),
        <MenuItem
          key="leave-group"
          onClick={() => {
            void onLeave();
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Leave group</ListItemText>
        </MenuItem>,
      ];
    }
    return [];
  }, [
    room?.room_type,
    isRoomAdmin,
    onLeave,
    onBlock,
    onInvite,
    onRename,
    onManageMembers,
  ]);

  return (
    <Box
      sx={{
        px: { xs: 0.75, sm: 1.5 },
        py: { xs: 0.85, sm: 1.5 },
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.35, sm: 1 },
        minWidth: 0,
        width: '100%',
        overflowX: 'hidden',
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
      }}
    >
      {!closeIcon && (
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={onBack ?? (() => navigate('/chat-full'))}
          sx={{
            color: 'white',
            minWidth: 0,
            mr: { xs: 0, sm: 0.5 },
            px: { xs: 0.35, sm: 1 },
            flexShrink: 0,
            '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Back
          </Box>
        </Button>
      )}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1.25 },
          minWidth: 0,
          order: { xs: 2, sm: 0 },
          width: { xs: 'calc(100% - 88px)', sm: 'auto' },
        }}
      >
        <ProfileAvatar
          src={avatarUrl}
          alt={avatarAlt}
          size="small"
          sx={{ flexShrink: 0 }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {displayName}
          </Typography>
          {room?.room_type === 'dm' && otherUserId && (
            <OnlineIndicator
              otherUserId={otherUserId}
              onlineUsers={onlineUsers}
              typingUsers={typingUsers}
            />
          )}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          flexShrink: 0,
          ml: 'auto',
          order: { xs: 1, sm: 0 },
        }}
      >
        {onToggleFavorite && (
          <Tooltip
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <IconButton
              onClick={onToggleFavorite}
              aria-label={
                isFavorite ? 'Remove from favorites' : 'Add to favorites'
              }
              sx={{
                color: isFavorite ? '#f5c451' : 'rgba(255,255,255,0.75)',
                bgcolor: isFavorite ? 'rgba(245,196,81,0.14)' : 'transparent',
                border: isFavorite
                  ? '1px solid rgba(245,196,81,0.28)'
                  : '1px solid transparent',
                boxShadow: isFavorite
                  ? '0 0 0 1px rgba(245,196,81,0.08) inset'
                  : 'none',
                transition:
                  'color 120ms ease, background-color 120ms ease, border-color 120ms ease',
                '&:hover': {
                  color: '#f5c451',
                  bgcolor: 'rgba(245,196,81,0.18)',
                },
              }}
            >
              {isFavorite ? (
                <StarIcon
                  fontSize="small"
                  data-testid={`chat-room-header-favorite-icon-filled-${room?.id ?? 'unknown'}`}
                />
              ) : (
                <StarBorderIcon
                  fontSize="small"
                  data-testid={`chat-room-header-favorite-icon-outline-${room?.id ?? 'unknown'}`}
                />
              )}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Chat options">
          <IconButton
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            aria-label="Chat options"
            sx={{ color: 'rgba(255,255,255,0.75)' }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {onPopOut && (
          <Tooltip title="Open in new window">
            <IconButton
              onClick={onPopOut}
              aria-label="Open in new window"
              sx={{ color: 'rgba(255,255,255,0.75)' }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {closeIcon && (
          <Tooltip title="Close">
            <IconButton
              onClick={onBack}
              aria-label="Close"
              sx={{ color: 'rgba(255,255,255,0.75)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
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
        {...menuItems}
      </Menu>
    </Box>
  );
};
