import MessageIcon from '@mui/icons-material/Message';
import {
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateGroupDialog } from '../chat/dialogs/CreateGroupDialog';
import { StartDmDialog } from '../chat/dialogs/StartDmDialog';
import {
  useFeatureFlag,
  useProductionComingSoonMode,
} from '../../context/FeatureFlagsContext';
import { useChatRooms } from '../../hooks/useChat';
import { useMessenger } from '../../context/MessengerContext';
import { supabase } from '../../lib/auth/supabaseClient';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import type {
  ChatRoomFilter,
  ChatRoomSort,
} from '../../lib/chat/roomListState';
import { getChatRoomLabel } from '../../lib/chat/roomListState';
import { chatUiForMember } from '../../lib/utils/chatUiForMember';
import { useUatBannerOffset } from '../../lib/utils/useUatBannerOffset';
import { MessengerOverlayPanel } from './MessengerOverlayPanel';

const DRAWER_WIDTH = 360;

export const MessengerOverlay = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const messenger = useMessenger();
  const [session, setSession] = useState<Session | null>(null);
  const [startDmOpen, setStartDmOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ChatRoomFilter>('all');
  const [sort, setSort] = useState<ChatRoomSort>('favorites');
  const bannerOffsetPx = useUatBannerOffset();
  const drawerTopDesktop = 64 + bannerOffsetPx;
  const drawerTopMobile = 56 + bannerOffsetPx;
  const chatEnabled = useFeatureFlag('chat');
  const productionComingSoon = useProductionComingSoonMode();
  const floatingButtonBg = 'rgba(12, 18, 29, 0.96)';
  const floatingButtonBorder = 'rgba(141,188,229,0.34)';

  const {
    rooms,
    loading: roomsLoading,
    removeChat,
    createDm,
    createGroup,
    fetchRooms,
    toggleFavorite,
  } = useChatRooms();

  useEffect(() => {
    if (messenger?.overlayOpen && session?.user?.id) void fetchRooms();
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
      if (!id) return;
      setStartDmOpen(false);
      messenger?.openPopOut(id);
      messenger?.toggleOverlay();
    },
    [createDm, messenger],
  );

  const handleCreateGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      const id = await createGroup(name, memberIds);
      if (!id) return;
      setCreateGroupOpen(false);
      messenger?.openPopOut(id);
      messenger?.toggleOverlay();
    },
    [createGroup, messenger],
  );

  const handleOpenRoom = useCallback(
    (roomId: string) => {
      messenger?.openPopOut(roomId);
      messenger?.closeOverlay();
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

  const openOverlay = messenger?.openOverlay;
  const getRoomLabel = useCallback(
    (r: ChatRoomWithMembers) => getChatRoomLabel(r, session?.user?.id),
    [session?.user?.id],
  );

  if (productionComingSoon || !chatUiForMember(chatEnabled, session?.user?.id))
    return null;
  if (!session?.user) return null;

  const showFloatingChat = Boolean(messenger && !messenger.overlayOpen);
  const floatingChatButton = showFloatingChat ? (
    <Tooltip title="Open messages">
      <IconButton
        onClick={openOverlay}
        aria-label="Open messages"
        data-testid="messenger-open-button"
        size="medium"
        sx={{
          position: 'fixed',
          right: 28,
          top: mobile ? 56 + bannerOffsetPx : 80 + bannerOffsetPx,
          zIndex: 1200,
          bgcolor: floatingButtonBg,
          border: `1px solid ${floatingButtonBorder}`,
          borderRadius: '8px 0 0 8px',
          borderRight: 'none',
          boxShadow: '0 14px 28px rgba(0,0,0,0.35)',
          color: 'rgba(255,255,255,0.96)',
          '&:hover': { bgcolor: 'rgba(20, 29, 45, 0.98)' },
        }}
      >
        <MessageIcon />
      </IconButton>
    </Tooltip>
  ) : null;

  return (
    <>
      {floatingChatButton && createPortal(floatingChatButton, document.body)}

      {messenger?.overlayOpen &&
        createPortal(
          <MessengerOverlayPanel
            mobile={mobile}
            drawerTopDesktop={drawerTopDesktop}
            drawerTopMobile={drawerTopMobile}
            drawerWidth={DRAWER_WIDTH}
            avatarUrl={avatarUrl}
            currentUserId={session.user.id}
            session={session}
            menuButtonClick={setMenuAnchor}
            onStartDm={() => setStartDmOpen(true)}
            onCreateGroup={() => setCreateGroupOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filter={filter}
            setFilter={setFilter}
            sort={sort}
            setSort={setSort}
            roomsLoading={roomsLoading}
            rooms={rooms}
            getRoomLabel={getRoomLabel}
            onOpenRoom={handleOpenRoom}
            onRemoveChat={handleRemoveChat}
            onToggleFavorite={toggleFavorite}
            onBackdropClick={messenger.closeOverlay}
            onClose={messenger.closeOverlay}
          />,
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
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            messenger?.closeOverlay();
            navigate('/chat');
          }}
        >
          Manage conversations
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            messenger?.closeOverlay();
            navigate('/chat');
          }}
        >
          Messaging settings
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            messenger?.closeOverlay();
            navigate('/chat');
          }}
        >
          Set away message
        </MenuItem>
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
