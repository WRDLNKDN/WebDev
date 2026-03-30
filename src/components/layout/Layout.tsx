import { Box, useMediaQuery, useTheme } from '@mui/material';
import { lazy, Suspense, useSyncExternalStore } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  MessengerProvider,
  useMessenger,
} from '../../context/MessengerContext';
import {
  useFeatureFlag,
  useProductionComingSoonMode,
} from '../../context/FeatureFlagsContext';
import {
  getHomeHeroPhaseSnapshot,
  subscribeHomeHeroPhase,
} from '../../lib/utils/homeHeroPhaseStore';
import { chatUiForMember } from '../../lib/utils/chatUiForMember';
import { homeMatteUntilContentRevealEnabled } from '../../lib/utils/homeMatteUntilReveal';
import {
  buildAppScrollContainerSx,
  buildRootShellSx,
  layoutFeedGridAlpha,
} from './layoutShellSx';
import {
  useLayoutDocumentScrollLock,
  useLayoutLastActivePing,
  useLayoutSupabaseSession,
} from './useLayoutLifecycleEffects';
import { ErrorBoundary } from './ErrorBoundary';
import { UatBanner } from './UatBanner';

const Navbar = lazy(async () => ({
  default: (await import('./Navbar')).Navbar,
}));
const Footer = lazy(async () => ({
  default: (await import('./Footer')).Footer,
}));
const MessengerOverlay = lazy(async () => ({
  default: (await import('./MessengerOverlay')).MessengerOverlay,
}));
const ChatPopover = lazy(async () => ({
  default: (await import('../chat/overlay/ChatPopover')).ChatPopover,
}));

const NavbarFallback = () => (
  <Box sx={{ minHeight: { xs: 56, md: 64 }, flexShrink: 0 }} />
);

const LayoutContent = () => {
  const theme = useTheme();
  const { pathname } = useLocation();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const hideFooterForDockedChat = pathname.startsWith('/chat-full') && isMdUp;
  const messenger = useMessenger();
  const session = useLayoutSupabaseSession();
  useLayoutDocumentScrollLock();
  useLayoutLastActivePing();
  const isJoin = pathname.startsWith('/join');
  const isAdmin = pathname.startsWith('/admin');
  const isHome = pathname === '/';
  /** Softer grid behind feed so posts read clearly (see Feed shell). */
  const isFeedRoute = pathname === '/feed';
  const chatEnabled = useFeatureFlag('chat');
  const productionComingSoon = useProductionComingSoonMode();
  /**
   * Chat shell UI only when a Member is signed in — never for guests (any env).
   * Off on production marketing-only home; UAT keeps messenger for signed-in QA.
   */
  const showMessengerUi =
    !isAdmin &&
    !productionComingSoon &&
    chatUiForMember(chatEnabled, session?.user?.id);
  const isLight = theme.palette.mode === 'light';

  const homeHeroShellPhase = useSyncExternalStore(
    subscribeHomeHeroPhase,
    getHomeHeroPhaseSnapshot,
    () => 'video' as const,
  );

  /** Matte only while hero video plays; grid returns after copy reveals (see VITE_HOME_MATTE_UNTIL_CONTENT_REVEAL). */
  const matteDuringHomeVideo =
    isHome &&
    homeMatteUntilContentRevealEnabled() &&
    homeHeroShellPhase === 'video';

  const homeMatteFeatureEnabled = homeMatteUntilContentRevealEnabled();
  const feedGridAlpha = layoutFeedGridAlpha(isLight, isFeedRoute);
  const rootShellSx = buildRootShellSx({
    isHome,
    isLight,
    homeMatteFeatureEnabled,
    matteDuringHomeVideo,
    feedGridAlpha,
  });

  const rootBgcolor = isLight ? 'background.default' : 'background.default';

  const scrollContainerSx = buildAppScrollContainerSx({
    isJoin,
    isHome,
    isFeedRoute,
    isLight,
  });

  // Navbar is outside the scroll container so iOS Safari does not treat taps on
  // Sign in/Join as scroll gestures (single scroll container = content only).
  return (
    <Box
      sx={{
        height: '100dvh',
        minHeight:
          '100vh' /* fallback when dvh is 0 or wrong on some mobile browsers */,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: rootBgcolor,
        ...rootShellSx,
      }}
    >
      <Suspense fallback={<NavbarFallback />}>
        <Navbar />
      </Suspense>
      <Box
        className="app-scroll-container"
        data-testid="app-scroll-container"
        sx={scrollContainerSx}
      >
        <UatBanner />
        <Box
          component="main"
          data-testid="app-main"
          tabIndex={0}
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            overflowY: 'visible',
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Box>
      </Box>
      {!isJoin && !isAdmin && !hideFooterForDockedChat && (
        <Box
          component="footer"
          sx={{
            flexShrink: 0,
            position: 'relative',
            /* Above `.app-scroll-container` (z-index 1) so footer menus are not covered by main content. */
            zIndex: 2,
          }}
        >
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </Box>
      )}
      {showMessengerUi && (
        <Suspense fallback={null}>
          <MessengerOverlay />
        </Suspense>
      )}
      {showMessengerUi && session?.user && messenger?.popoverRoomId && (
        <Suspense fallback={null}>
          <ChatPopover
            roomId={messenger.popoverRoomId}
            onClose={messenger.closePopover}
            session={session}
          />
        </Suspense>
      )}
    </Box>
  );
};

export const Layout = () => {
  return (
    <MessengerProvider>
      <LayoutContent />
    </MessengerProvider>
  );
};
