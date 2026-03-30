import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import BlockIcon from '@mui/icons-material/Block';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MarkChatUnreadOutlinedIcon from '@mui/icons-material/MarkChatUnreadOutlined';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
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
  ButtonBase,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createNormalizedGroupImageAsset } from '../../../lib/media/assets';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';
import type { ChatRoomWithMembers } from '../../../hooks/useChat';
import { OnlineIndicator } from './OnlineIndicator';
import { RemoveChatConfirmDialog } from '../dialogs/RemoveChatConfirmDialog';
import {
  CHAT_FAVORITE_ACTIVE_BUTTON_SX,
  CHAT_FAVORITE_ICON_BUTTON_STAR_SX,
  CHAT_FAVORITE_IDLE_BUTTON_SX,
} from '../../../theme/chatFavoriteStyles';

type ChatRoomHeaderProps = {
  room: ChatRoomWithMembers | null;
  currentUserId: string;
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
  isRoomAdmin: boolean;
  onLeave: () => Promise<void>;
  onBlock: () => void;
  onInvite: () => void;
  onEditDetails: () => void;
  onManageMembers: () => void;
  onShowMembers: () => void;
  /** When provided, used instead of navigate('/chat-full') for Back button */
  onBack?: () => void;
  /** When true, show X icon instead of Back button (for popover) */
  closeIcon?: boolean;
  /** When provided, opens this room in a new window (LinkedIn-style pop out) */
  onPopOut?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  showBackButton?: boolean;
  onRemoveConversation?: () => void;
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
  onEditDetails,
  onManageMembers,
  onShowMembers,
  onBack,
  closeIcon,
  onPopOut,
  isFavorite,
  onToggleFavorite,
  showBackButton = true,
  onRemoveConversation,
}: ChatRoomHeaderProps) => {
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const headerIconMuted = 'rgba(255,255,255,0.52)';
  const headerIconHover = 'rgba(255,255,255,0.88)';

  const otherMember = room?.members?.find((m) => m.user_id !== currentUserId);
  const otherUserId = otherMember?.user_id;
  const displayName =
    room?.room_type === 'group'
      ? room?.name
      : otherMember?.profile?.display_name ||
        otherMember?.profile?.handle ||
        'Chat';

  let avatarUrl: string | undefined;
  if (room?.room_type === 'dm') {
    avatarUrl = otherMember?.profile?.avatar ?? undefined;
  } else if (room) {
    avatarUrl =
      createNormalizedGroupImageAsset(room)?.displayUrl ??
      room.image_url ??
      undefined;
  }
  const avatarAlt = displayName || 'Chat';
  let secondaryLabel: string | undefined;
  if (room?.room_type === 'group') {
    secondaryLabel = `${room.members?.length ?? 0} members`;
  } else if (!otherUserId) {
    secondaryLabel = 'Direct message';
  }
  let secondaryLabelNode: ReactNode = null;
  if (secondaryLabel) {
    if (room?.room_type === 'group') {
      secondaryLabelNode = (
        <ButtonBase
          onClick={onShowMembers}
          sx={{
            mt: 0.35,
            borderRadius: 1,
            color: 'text.secondary',
            justifyContent: 'flex-start',
            '&:hover, &:focus-visible': {
              color: 'text.primary',
              textDecoration: 'underline',
              textUnderlineOffset: '0.14em',
            },
          }}
        >
          <Typography variant="caption">{secondaryLabel}</Typography>
        </ButtonBase>
      );
    } else {
      secondaryLabelNode = (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.15 }}
        >
          {secondaryLabel}
        </Typography>
      );
    }
  }

  const menuItems = useMemo(() => {
    const items = [
      <MenuItem key="mark-unread" disabled>
        <ListItemIcon>
          <MarkChatUnreadOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Mark as unread" secondary="Coming soon" />
      </MenuItem>,
      <MenuItem key="mute" disabled>
        <ListItemIcon>
          <NotificationsOffOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Mute conversation" secondary="Coming soon" />
      </MenuItem>,
      <MenuItem key="archive" disabled>
        <ListItemIcon>
          <ArchiveOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Archive" secondary="Coming soon" />
      </MenuItem>,
      <Divider key="divider-utilities" />,
    ];

    if (onToggleFavorite) {
      items.push(
        <MenuItem
          key="favorite"
          onClick={() => {
            Promise.resolve(onToggleFavorite()).catch(() => {});
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            {isFavorite ? (
              <StarIcon fontSize="small" />
            ) : (
              <StarBorderIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={isFavorite ? 'Unstar conversation' : 'Star conversation'}
          />
        </MenuItem>,
      );
    }

    if (room?.room_type === 'dm') {
      items.push(
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
          <ListItemText primary="Block member" />
        </MenuItem>,
      );
    }

    if (room?.room_type === 'group' && isRoomAdmin) {
      items.push(
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
          <ListItemText primary="Invite members" />
        </MenuItem>,
        <MenuItem
          key="rename"
          onClick={() => {
            onEditDetails();
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit group details" />
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
          <ListItemText primary="Manage members" />
        </MenuItem>,
      );
    }

    items.push(
      <Divider key="divider-danger" />,
      <MenuItem
        key="leave"
        onClick={() => {
          void onLeave();
          setMenuAnchor(null);
        }}
      >
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={
            room?.room_type === 'group' ? 'Leave group' : 'Leave conversation'
          }
        />
      </MenuItem>,
    );

    if (onRemoveConversation) {
      items.push(
        <MenuItem
          key="delete"
          onClick={() => {
            setConfirmRemoveOpen(true);
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete conversation" />
        </MenuItem>,
      );
    }

    return items;
  }, [
    isFavorite,
    room?.room_type,
    isRoomAdmin,
    onLeave,
    onBlock,
    onInvite,
    onEditDetails,
    onManageMembers,
    onToggleFavorite,
    onRemoveConversation,
  ]);

  return (
    <Box
      sx={{
        px: { xs: 0.9, sm: 1.2 },
        py: { xs: 0.75, sm: 0.95 },
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.35, sm: 1 },
        minWidth: 0,
        width: '100%',
        overflowX: 'hidden',
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
      }}
    >
      {!closeIcon && showBackButton && (
        <Tooltip title="Back to conversations">
          <span>
            <IconButton
              size="small"
              onClick={onBack ?? (() => navigate('/chat-full'))}
              aria-label="Back to conversations"
              sx={{
                color: headerIconMuted,
                flexShrink: 0,
                mr: { xs: 0, sm: 0.25 },
                '&:hover': {
                  color: headerIconHover,
                  bgcolor: 'rgba(255,255,255,0.06)',
                },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
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
          sx={{ flexShrink: 0, width: 36, height: 36 }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            noWrap={room?.room_type !== 'group'}
            sx={{ fontSize: '0.98rem', lineHeight: 1.2 }}
          >
            {displayName}
          </Typography>
          {room?.room_type === 'group' && room.description ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mt: 0.25,
                lineHeight: 1.35,
                whiteSpace: 'pre-wrap',
              }}
            >
              {room.description}
            </Typography>
          ) : null}
          {room?.room_type === 'dm' && otherUserId && (
            <OnlineIndicator
              otherUserId={otherUserId}
              onlineUsers={onlineUsers}
              typingUsers={typingUsers}
            />
          )}
          {secondaryLabelNode}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flexShrink: 0,
          ml: 'auto',
          order: { xs: 1, sm: 0 },
        }}
      >
        {onToggleFavorite && (
          <Tooltip
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <span>
              <IconButton
                type="button"
                size="small"
                onClick={() => {
                  Promise.resolve(onToggleFavorite()).catch(() => {});
                }}
                aria-label={
                  isFavorite ? 'Remove from favorites' : 'Add to favorites'
                }
                sx={{
                  minWidth: 36,
                  minHeight: 36,
                  transition:
                    'color 120ms ease, background-color 120ms ease, border-color 120ms ease, opacity 120ms ease',
                  ...(isFavorite
                    ? CHAT_FAVORITE_ACTIVE_BUTTON_SX
                    : {
                        ...CHAT_FAVORITE_IDLE_BUTTON_SX,
                        color: headerIconMuted,
                        '&:hover': { color: headerIconHover },
                      }),
                }}
              >
                {isFavorite ? (
                  <StarIcon
                    sx={CHAT_FAVORITE_ICON_BUTTON_STAR_SX}
                    data-testid={`chat-room-header-favorite-icon-filled-${room?.id ?? 'unknown'}`}
                  />
                ) : (
                  <StarBorderIcon
                    fontSize="small"
                    data-testid={`chat-room-header-favorite-icon-outline-${room?.id ?? 'unknown'}`}
                  />
                )}
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title="Chat options">
          <span>
            <IconButton
              size="small"
              onClick={(e) => {
                if (menuItems.length === 0) {
                  return;
                }
                setMenuAnchor(e.currentTarget);
              }}
              aria-label="Chat options"
              aria-disabled={menuItems.length === 0}
              sx={{
                color: headerIconMuted,
                opacity: menuItems.length === 0 ? 0.56 : 1,
                cursor: menuItems.length === 0 ? 'default' : 'pointer',
                '&:hover': {
                  color: headerIconHover,
                  bgcolor: 'rgba(255,255,255,0.06)',
                },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {onPopOut && (
          <Tooltip title="Open in new window">
            <span>
              <IconButton
                size="small"
                onClick={onPopOut}
                aria-label="Open in new window"
                sx={{
                  color: headerIconMuted,
                  '&:hover': {
                    color: headerIconHover,
                    bgcolor: 'rgba(255,255,255,0.06)',
                  },
                }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {closeIcon && (
          <Tooltip title="Close">
            <span>
              <IconButton
                size="small"
                onClick={onBack}
                aria-label="Close"
                sx={{
                  color: headerIconMuted,
                  '&:hover': {
                    color: headerIconHover,
                    bgcolor: 'rgba(255,255,255,0.06)',
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </span>
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
          paper: {
            sx: {
              zIndex: 1500,
              minWidth: 220,
              mt: 0.75,
            },
          },
        }}
      >
        {...menuItems}
      </Menu>
      {onRemoveConversation ? (
        <RemoveChatConfirmDialog
          open={confirmRemoveOpen}
          roomLabel={displayName || 'this conversation'}
          onClose={() => setConfirmRemoveOpen(false)}
          onConfirm={() => Promise.resolve(onRemoveConversation())}
        />
      ) : null}
    </Box>
  );
};
