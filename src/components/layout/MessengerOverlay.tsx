import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCommentIcon from '@mui/icons-material/AddComment';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import MessageIcon from '@mui/icons-material/Message';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
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
import { useFeatureFlag } from '../../context/FeatureFlagsContext';
import { useChatRooms } from '../../hooks/useChat';
import { useMessenger } from '../../context/MessengerContext';
import { supabase } from '../../lib/auth/supabaseClient';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import { useUatBannerOffset } from '../../lib/utils/useUatBannerOffset';
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
  const [messageTab, setMessageTab] = useState<'focused' | 'other'>('focused');
  const bannerOffsetPx = useUatBannerOffset();
  const drawerTopDesktop = 64 + bannerOffsetPx;
  const drawerTopMobile = 56 + bannerOffsetPx;
  const chatEnabled = useFeatureFlag('chat');

  const {
    rooms,
    loading: roomsLoading,
    removeChat,
    createDm,
    createGroup,
    fetchRooms,
  } = useChatRooms();

  // Refetch rooms when overlay opens to refresh unread counts
  useEffect(() => {
    if (messenger?.overlayOpen && session?.user?.id) {
      void fetchRooms();
    }
  }, [messenger?.overlayOpen, session?.user?.id, fetchRooms]);

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
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar')
        .eq('id', session.user.id)
        .maybeSingle();
      setAvatarUrl(data?.avatar ?? null);
    })();
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

  /* Desktop: always show floating button when overlay closed. Mobile: show floating button when chat is disabled (nav link hidden). */
  const showFloatingChat =
    messenger && !messenger.overlayOpen && (!mobile || !chatEnabled);
  const floatingChatButton = showFloatingChat ? (
    <IconButton
      onClick={openOverlay}
      aria-label="Open messages"
      size="medium"
      sx={{
        position: 'fixed',
        right: 28,
        top: mobile ? 56 + bannerOffsetPx : 80 + bannerOffsetPx,
        zIndex: 1200,
        bgcolor: 'background.paper',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px 0 0 8px',
        borderRight: 'none',
        boxShadow: 2,
        color: 'text.primary',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <MessageIcon />
    </IconButton>
  ) : null;

  return (
    <>
      {/* Floating chat tab: portaled to body so it cannot extend layout / cause second scrollbar */}
      {floatingChatButton && createPortal(floatingChatButton, document.body)}

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
                top: mobile ? drawerTopMobile : drawerTopDesktop,
                width: mobile ? '100%' : DRAWER_WIDTH,
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

                {/* Search bar — compact, LinkedIn-style */}
                <TextField
                  size="small"
                  placeholder="Search messages"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ mr: 0 }}>
                        <SearchIcon
                          sx={{ color: 'text.secondary', fontSize: 18 }}
                        />
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

                {/* Focused / Other tabs — LinkedIn-style */}
                <Stack direction="row" sx={{ px: 1, pb: 0 }}>
                  {(
                    [
                      { id: 'focused' as const, label: 'Focused' },
                      { id: 'other' as const, label: 'Other' },
                    ] as const
                  ).map(({ id, label }) => {
                    const active = messageTab === id;
                    return (
                      <Typography
                        key={id}
                        component="button"
                        type="button"
                        onClick={() => setMessageTab(id)}
                        sx={{
                          border: 0,
                          background: 'none',
                          cursor: 'pointer',
                          font: 'inherit',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: active ? '#00a660' : 'text.secondary',
                          pb: 0.75,
                          pr: 2,
                          mr: 1,
                          borderBottom: '2px solid',
                          borderBottomColor: active ? '#00a660' : 'transparent',
                          borderRadius: 0,
                          '&:hover': {
                            color: active ? '#00a660' : 'text.primary',
                          },
                        }}
                      >
                        {label}
                      </Typography>
                    );
                  })}
                </Stack>

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
                      const bySearch = rooms.filter(
                        (r) =>
                          !searchQuery.trim() ||
                          getRoomLabel(r)
                            .toLowerCase()
                            .includes(searchQuery.trim().toLowerCase()),
                      );
                      const filtered =
                        messageTab === 'focused'
                          ? bySearch.filter((r) => (r.unread_count ?? 0) > 0)
                          : bySearch;
                      if (
                        messageTab === 'focused' &&
                        filtered.length === 0 &&
                        bySearch.length > 0
                      ) {
                        return (
                          <ListItemButton disabled>
                            <ListItemText
                              primary="No focused conversations"
                              secondary="Conversations with new messages appear here"
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItemButton>
                        );
                      }
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
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.5}
                            >
                              <Typography variant="body2" fontWeight={600}>
                                {getRoomLabel(r)}
                              </Typography>
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
                                  {r.unread_count! > 99
                                    ? '99+'
                                    : r.unread_count}
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
