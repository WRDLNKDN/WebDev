import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCommentIcon from '@mui/icons-material/AddComment';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import MessageIcon from '@mui/icons-material/Message';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState } from 'react';
import { CreateGroupDialog } from '../chat/CreateGroupDialog';
import { StartDmDialog } from '../chat/StartDmDialog';
import { useChatRooms } from '../../hooks/useChat';
import { useMessenger } from '../../context/MessengerContext';
import { supabase } from '../../lib/supabaseClient';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import { GLASS_CARD } from '../../theme/candyStyles';

const DRAWER_WIDTH = 360;

export const MessengerOverlay = () => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const messenger = useMessenger();
  const [session, setSession] = useState<Session | null>(null);
  const [startDmOpen, setStartDmOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    rooms,
    loading: roomsLoading,
    removeChat,
    createDm,
    createGroup,
    fetchRooms,
  } = useChatRooms();

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSession(data.session ?? null);
    };
    void init();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!cancelled) setSession(s ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('profiles')
      .select('avatar')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setAvatarUrl(data?.avatar ?? null));
  }, [session?.user?.id]);

  const handleStartDm = useCallback(
    async (userId: string) => {
      const id = await createDm(userId);
      if (id) {
        setStartDmOpen(false);
        messenger?.openPopOut(id);
        messenger?.toggleOverlay();
      }
    },
    [createDm, messenger],
  );

  const handleCreateGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      const id = await createGroup(name, memberIds);
      if (id) {
        setCreateGroupOpen(false);
        messenger?.openPopOut(id);
        messenger?.toggleOverlay();
      }
    },
    [createGroup, messenger],
  );

  const handleOpenRoom = useCallback(
    (roomId: string) => {
      messenger?.openPopOut(roomId);
      messenger?.toggleOverlay();
    },
    [messenger],
  );

  const handleRemoveChat = useCallback(
    async (e: React.MouseEvent, targetRoomId: string) => {
      e.stopPropagation();
      await removeChat(targetRoomId);
      await fetchRooms();
    },
    [removeChat, fetchRooms],
  );

  const openOverlay = messenger?.toggleOverlay;

  const getRoomLabel = useCallback(
    (r: ChatRoomWithMembers) => {
      if (r.room_type === 'group' && r.name) return r.name;
      const other = r.members?.find((m) => m.user_id !== session?.user?.id);
      return other?.profile?.display_name || other?.profile?.handle || 'User';
    },
    [session?.user?.id],
  );

  if (!session?.user?.id) return null;

  return (
    <>
      {/* Floating chat tab */}
      {messenger && !messenger.overlayOpen && (
        <Button
          endIcon={!mobile ? <MessageIcon /> : undefined}
          startIcon={mobile ? <MessageIcon /> : undefined}
          onClick={openOverlay}
          aria-label="Open messages"
          size={mobile ? 'small' : 'medium'}
          sx={{
            position: 'fixed',
            right: 0,
            top: mobile ? 64 : 80,
            zIndex: 1200,
            bgcolor: 'background.paper',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px 0 0 8px',
            borderRight: 'none',
            boxShadow: 2,
            color: 'text.primary',
            textTransform: 'none',
            minWidth: mobile ? 48 : 80,
            py: mobile ? 0.75 : 1,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {mobile ? '' : 'Chat'}
        </Button>
      )}

      {messenger?.overlayOpen &&
        createPortal(
          <>
            {/* Backdrop - click to close, no scroll lock */}
            <Box
              aria-hidden
              onClick={messenger.toggleOverlay}
              sx={{
                position: 'fixed',
                inset: 0,
                bgcolor: 'rgba(0,0,0,0.35)',
                zIndex: 1299,
                animation: 'fadeIn 0.25s ease-out',
                '@keyframes fadeIn': {
                  from: { opacity: 0 },
                  to: { opacity: 1 },
                },
              }}
            />
            {/* Popup panel - conversation list only; clicking a room opens mini window */}
            <Box
              onClick={(e) => e.stopPropagation()}
              sx={{
                ...GLASS_CARD,
                position: 'fixed',
                right: 0,
                top: mobile ? 56 : 64,
                width: mobile ? '100%' : DRAWER_WIDTH,
                height: mobile ? 'calc(100vh - 56px)' : 'calc(100vh - 64px)',
                zIndex: 1300,
                borderLeft: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px 0 0 8px',
                boxSizing: 'border-box',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation:
                  'messengerSlideIn 0.35s cubic-bezier(0.32, 0, 0.37, 1)',
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
                {/* LinkedIn-style header: avatar + title + icon buttons */}
                <Box
                  sx={{
                    p: 1.5,
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Avatar
                    src={avatarUrl ?? undefined}
                    sx={{ width: 36, height: 36 }}
                  >
                    {session?.user?.user_metadata?.name?.[0] ?? '?'}
                  </Avatar>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    sx={{ flex: 1 }}
                  >
                    Messaging
                  </Typography>
                  <IconButton
                    aria-label="Messaging options"
                    onClick={(e) => setMenuAnchor(e.currentTarget)}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    aria-label="New message"
                    onClick={() => setStartDmOpen(true)}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    <AddCommentIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    aria-label="Create group"
                    onClick={() => setCreateGroupOpen(true)}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    <GroupAddIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Search bar */}
                <TextField
                  size="small"
                  placeholder="Search conversations"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ color: 'text.secondary', fontSize: 20 }}
                        />
                      </InputAdornment>
                    ),
                    sx: { py: 0.75, pl: 1 },
                  }}
                  sx={{
                    m: 1,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'action.hover',
                      '& fieldset': { borderColor: 'transparent' },
                    },
                  }}
                />

                <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                  {roomsLoading ? (
                    <ListItemButton disabled>
                      <Typography variant="body2" color="text.secondary">
                        Loading…
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
                      const filtered = rooms.filter(
                        (r) =>
                          !searchQuery.trim() ||
                          getRoomLabel(r)
                            .toLowerCase()
                            .includes(searchQuery.trim().toLowerCase()),
                      );
                      if (filtered.length === 0) {
                        return (
                          <ListItemButton disabled>
                            <ListItemText
                              primary="No matches"
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItemButton>
                        );
                      }
                      return filtered.map((r) => (
                        <ListItemButton
                          key={r.id}
                          onClick={() => handleOpenRoom(r.id)}
                          sx={{
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {getRoomLabel(r)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.room_type === 'group'
                                ? `${r.members?.length ?? 0} members`
                                : '1:1'}
                            </Typography>
                          </Box>
                          <IconButton
                            aria-label="Remove chat"
                            size="small"
                            onClick={(e) => handleRemoveChat(e, r.id)}
                            sx={{ color: 'text.secondary', ml: 0.5 }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </ListItemButton>
                      ));
                    })()
                  )}
                </List>
              </Box>
            </Box>
          </>,
          document.body,
        )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        <MenuItem disabled>Manage conversations</MenuItem>
        <MenuItem disabled>Messaging settings</MenuItem>
        <MenuItem disabled>Set away message</MenuItem>
      </Menu>

      <StartDmDialog
        open={startDmOpen}
        onClose={() => setStartDmOpen(false)}
        onSelect={handleStartDm}
      />
      <CreateGroupDialog
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreate={handleCreateGroup}
        currentUserId={session?.user?.id}
      />
    </>
  );
};
