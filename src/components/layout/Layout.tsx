import { Box } from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  MessengerProvider,
  useMessenger,
} from '../../context/MessengerContext';
import { useFeatureFlag } from '../../context/FeatureFlagsContext';
import { updateLastActive } from '../../lib/utils/updateLastActive';
import { supabase } from '../../lib/auth/supabaseClient';
import { ErrorBoundary } from './ErrorBoundary';
import { UatBanner } from './UatBanner';
import { PAGE_BACKGROUND } from '../../theme/candyStyles';

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

const PAGE_BG = {
  ...PAGE_BACKGROUND,
  backgroundAttachment: { xs: 'scroll', md: 'fixed' },
};

const NavbarFallback = () => (
  <Box sx={{ minHeight: { xs: 56, md: 64 }, flexShrink: 0 }} />
);

const LayoutContent = () => {
  const { pathname } = useLocation();
  const messenger = useMessenger();
  const [session, setSession] = useState<Session | null>(null);
  const isJoin = pathname.startsWith('/join');
  const isAdmin = pathname.startsWith('/admin');
  const chatEnabled = useFeatureFlag('chat');

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
        ...PAGE_BG,
      }}
    >
      <Suspense fallback={<NavbarFallback />}>
        <Navbar />
      </Suspense>
      <Box
        className="app-scroll-container"
        data-testid="app-scroll-container"
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
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
      {!isAdmin && chatEnabled && (
        <Suspense fallback={null}>
          <MessengerOverlay />
        </Suspense>
      )}
      {!isAdmin && chatEnabled && session?.user && messenger?.popoverRoomId && (
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
