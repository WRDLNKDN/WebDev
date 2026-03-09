import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Backdrop,
  Box,
  CircularProgress,
  IconButton,
  Snackbar,
  Stack,
  Toolbar,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useNotificationsUnread } from '../../hooks/useNotificationsUnread';
import { useFeatureFlag } from '../../context/FeatureFlagsContext';
import { NavbarDesktopAuthControls } from './navbar/NavbarDesktopAuthControls';
import { NavbarDesktopNavLinks } from './navbar/NavbarDesktopNavLinks';
import { NavbarMobileAuthControls } from './navbar/NavbarMobileAuthControls';
import { NavbarMobileDrawer } from './navbar/NavbarMobileDrawer';
import { NavbarSearch } from './navbar/NavbarSearch';
import { useNavbarAuth } from './navbar/useNavbarAuth';
import {
  SEARCH_MAX_QUERY_CHARS,
  SEARCH_MIN_LENGTH,
  useNavbarSearch,
} from './navbar/useNavbarSearch';

const storeUrl =
  (import.meta.env.VITE_STORE_URL as string | undefined) ||
  'https://wrdlnkdn.com/store-1';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const forcePublicHeader = path.startsWith('/join');
  const isFeedActive = path === '/feed';
  const isJoinActive = path.startsWith('/join');
  const isDirectoryActive =
    path === '/directory' || path.startsWith('/directory');
  const eventsEnabled = useFeatureFlag('events');
  const directoryEnabled = useFeatureFlag('directory');
  const storeEnabled = useFeatureFlag('store');
  const chatEnabled = useFeatureFlag('chat');
  const groupsEnabled = useFeatureFlag('groups');
  const gamesEnabled = useFeatureFlag('games');
  const feedEnabled = useFeatureFlag('feed');
  const dashboardEnabled = useFeatureFlag('dashboard');
  const isDashboardActive =
    path === '/dashboard' || path.startsWith('/dashboard/');

  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const searchPopperRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { avatarUrl } = useCurrentUserAvatar();
  const notificationsUnread = useNotificationsUnread();
  const isEventsActive = path === '/events' || path.startsWith('/events/');
  const isGroupsActive = path === '/groups' || path.startsWith('/groups/');
  const isChatActive = path === '/chat-full' || path.startsWith('/chat-full/');
  const {
    session,
    sessionLoaded,
    onboardingLoaded,
    profileOnboarded,
    isAdmin,
    snack,
    setSnack,
    drawerOpen,
    setDrawerOpen,
    avatarMenuAnchor,
    setAvatarMenuAnchor,
    joinLoading,
    handleSignOut,
    openJoin,
    openSignIn,
  } = useNavbarAuth({ path, forcePublicHeader, navigate });
  const showAuthedHeader =
    Boolean(session) && profileOnboarded && !forcePublicHeader;
  const {
    searchQuery,
    setSearchQuery,
    searchMatches,
    searchLoading,
    searchOpen,
    setSearchOpen,
    closeSearchDropdown,
  } = useNavbarSearch({
    showAuthedHeader,
    searchAnchorEl,
    searchPopperRef,
  });

  return (
    <>
      <AppBar
        component="nav"
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: 'rgba(18, 18, 18, 0.9)', // Deep glass effect
          backdropFilter: 'blur(12px)',
          zIndex: 1100,
          isolation: 'isolate',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Toolbar
          sx={{
            py: 0.5,
            px: { xs: 1, sm: 2 },
            minHeight: { xs: 48, sm: 56 },
            gap: { xs: 0.5, sm: 1 },
            overflow: 'visible',
          }}
        >
          {isMobile && (
            <Tooltip title="Open menu">
              <IconButton
                color="inherit"
                aria-label="Open menu"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 0.5 }}
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Stack
            direction="row"
            alignItems="center"
            spacing={0}
            sx={{
              mr: isMobile ? 0.5 : 2,
              minHeight: { xs: 40, sm: 48 },
              gap: 3,
              overflow: 'visible',
              flexShrink: isMobile ? 1 : 0,
              minWidth: 0,
            }}
          >
            <Box
              component={RouterLink}
              to="/"
              aria-label="Go to home"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                height: { xs: 36, sm: 40 },
                flexShrink: isMobile ? 1 : 0,
                minWidth: 0,
                borderRadius: 1,
                py: 0.5,
                px: 0.5,
                bgcolor: 'rgba(0,0,0,0.35)',
                transition: 'opacity 0.2s, background-color 0.2s',
                overflow: 'hidden',
                '&:hover': { opacity: 0.9, bgcolor: 'rgba(0,0,0,0.5)' },
              }}
            >
              <Box
                component="img"
                src="/assets/wrdlnkdn_logo.png"
                alt=""
                sx={{
                  height: { xs: 22, sm: 26, md: 30 },
                  width: 'auto',
                  maxWidth: { xs: 110, sm: 160, md: 200 },
                  objectFit: 'contain',
                }}
              />
            </Box>
            <NavbarSearch
              forcePublicHeader={forcePublicHeader}
              isMobile={isMobile}
              searchAnchorEl={searchAnchorEl}
              setSearchAnchorEl={setSearchAnchorEl}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchOpen={searchOpen}
              setSearchOpen={setSearchOpen}
              searchMatches={searchMatches}
              searchLoading={searchLoading}
              searchPopperRef={searchPopperRef}
              closeSearchDropdown={closeSearchDropdown}
              minLength={SEARCH_MIN_LENGTH}
              maxChars={SEARCH_MAX_QUERY_CHARS}
              onSubmitQuery={(query) =>
                navigate(
                  query
                    ? `/directory?q=${encodeURIComponent(query)}`
                    : '/directory',
                )
              }
              onOpenDirectory={(query) =>
                navigate(`/directory?q=${encodeURIComponent(query)}`)
              }
              onOpenProfile={(handle) => navigate(`/profile/${handle}`)}
            />
          </Stack>

          <NavbarDesktopNavLinks
            isMobile={isMobile}
            isAdmin={isAdmin}
            showAuthedHeader={showAuthedHeader}
            chatEnabled={chatEnabled}
            dashboardEnabled={dashboardEnabled}
            directoryEnabled={directoryEnabled}
            eventsEnabled={eventsEnabled}
            feedEnabled={feedEnabled}
            storeEnabled={storeEnabled}
            isChatActive={isChatActive}
            isDashboardActive={isDashboardActive}
            isDirectoryActive={isDirectoryActive}
            isEventsActive={isEventsActive}
            isFeedActive={isFeedActive}
            storeUrl={storeUrl}
          />

          <Box sx={{ flexGrow: 1 }} />

          <NavbarDesktopAuthControls
            isMobile={isMobile}
            path={path}
            session={session}
            sessionLoaded={sessionLoaded}
            onboardingLoaded={onboardingLoaded}
            showAuthedHeader={showAuthedHeader}
            isJoinActive={isJoinActive}
            joinLoading={joinLoading}
            dashboardEnabled={dashboardEnabled}
            notificationsUnread={notificationsUnread}
            avatarUrl={avatarUrl}
            avatarMenuAnchor={avatarMenuAnchor}
            setAvatarMenuAnchor={setAvatarMenuAnchor}
            onOpenJoin={() => void openJoin()}
            onOpenSignIn={() => void openSignIn()}
            onSignOut={() => void handleSignOut()}
            setDrawerOpen={setDrawerOpen}
          />

          <NavbarMobileAuthControls
            isMobile={isMobile}
            path={path}
            session={session}
            sessionLoaded={sessionLoaded}
            onboardingLoaded={onboardingLoaded}
            showAuthedHeader={showAuthedHeader}
            isJoinActive={isJoinActive}
            dashboardEnabled={dashboardEnabled}
            notificationsUnread={notificationsUnread}
            avatarUrl={avatarUrl}
            setDrawerOpen={setDrawerOpen}
            setAvatarMenuAnchor={setAvatarMenuAnchor}
          />
        </Toolbar>
      </AppBar>

      <NavbarMobileDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        isAdmin={isAdmin}
        showAuthedHeader={showAuthedHeader}
        isJoinActive={isJoinActive}
        dashboardEnabled={dashboardEnabled}
        directoryEnabled={directoryEnabled}
        eventsEnabled={eventsEnabled}
        groupsEnabled={groupsEnabled}
        feedEnabled={feedEnabled}
        storeEnabled={storeEnabled}
        chatEnabled={chatEnabled}
        gamesEnabled={gamesEnabled}
        isDashboardActive={isDashboardActive}
        isDirectoryActive={isDirectoryActive}
        isEventsActive={isEventsActive}
        isFeedActive={isFeedActive}
        isGroupsActive={isGroupsActive}
        path={path}
        storeUrl={storeUrl}
        location={location}
      />
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={6000}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Backdrop
        open={joinLoading}
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 2,
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        <CircularProgress color="inherit" size={28} aria-label="Opening Join" />
        <Box sx={{ fontSize: 14, opacity: 0.9 }}>Opening Join…</Box>
      </Backdrop>
    </>
  );
};
