import { Box, useTheme } from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
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
import { updateLastActive } from '../../lib/utils/updateLastActive';
import { supabase } from '../../lib/auth/supabaseClient';
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

const HOME_SHELL_REVEAL_TRANSITION =
  'opacity 1500ms cubic-bezier(0.33, 1, 0.68, 1) 120ms';

const LayoutContent = () => {
  const theme = useTheme();
  const { pathname } = useLocation();
  const messenger = useMessenger();
  const [session, setSession] = useState<Session | null>(null);
  const isJoin = pathname.startsWith('/join');
  const isAdmin = pathname.startsWith('/admin');
  const isHome = pathname === '/';
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

  const darkShellBg = {
    backgroundImage: {
      xs: 'url("/assets/background-mobile.png")',
      md: 'url("/assets/background-desktop.png")',
    },
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: { xs: 'scroll', md: 'fixed' },
    position: 'relative' as const,
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage: `
                  linear-gradient(rgba(56,132,210,0.06) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(56,132,210,0.06) 1px, transparent 1px)
                `,
      backgroundSize: '24px 24px',
      pointerEvents: 'none',
      zIndex: 0,
    },
  };

  const rootShellSx =
    isHome && homeMatteUntilContentRevealEnabled() && !isLight
      ? {
          ...darkShellBg,
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundColor: '#000000',
            opacity: matteDuringHomeVideo ? 1 : 0,
            pointerEvents: 'none',
            transition: HOME_SHELL_REVEAL_TRANSITION,
            zIndex: 0,
          },
        }
      : isLight
        ? { backgroundImage: 'none' }
        : darkShellBg;

  const rootBgcolor = isLight ? 'background.default' : 'background.default';

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

  // Prevent double scrollbars: this layout owns the only scroll container (same pattern as Join)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflowY;
    const prevBodyOverflow = body.style.overflowY;
    html.style.overflowY = 'hidden';
    body.style.overflowY = 'hidden';
    return () => {
      html.style.overflowY = prevHtmlOverflow;
      body.style.overflowY = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) {
        await updateLastActive(supabase, data.session.user.id);
      }
    })();
  }, []);

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
        sx={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          overflowY:
            isJoin || (isHome && homeHeroShellPhase === 'video')
              ? 'hidden'
              : 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          // Mobile performance optimizations
          willChange: 'scroll-position',
          contain: 'layout style paint',
          // Hide scrollbar on home page
          ...(isHome && {
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }),
        }}
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
      {!isJoin && !isAdmin && (
        <Box component="footer" sx={{ flexShrink: 0 }}>
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
