import { Box } from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  MessengerProvider,
  useMessenger,
} from '../../context/MessengerContext';
import { updateLastActive } from '../../lib/utils/updateLastActive';
import { supabase } from '../../lib/auth/supabaseClient';
import { ChatPopover } from '../chat/ChatPopover';
import { ErrorBoundary } from './ErrorBoundary';
import { Footer } from './Footer';
import { UatBanner } from './UatBanner';
import { MessengerOverlay } from './MessengerOverlay';
import { Navbar } from './Navbar';
import { PAGE_BACKGROUND } from '../../theme/candyStyles';

const PAGE_BG = {
  ...PAGE_BACKGROUND,
  backgroundAttachment: { xs: 'scroll', md: 'fixed' },
};

const LayoutContent = () => {
  const { pathname } = useLocation();
  const messenger = useMessenger();
  const [session, setSession] = useState<Session | null>(null);
  const isHome = pathname === '/';
  const isJoin = pathname.startsWith('/join');

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
      <Navbar />
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
      {!isHome && !isJoin && (
        <Box component="footer" sx={{ flexShrink: 0 }}>
          <Footer showChatLink={Boolean(session?.user)} />
        </Box>
      )}
      <MessengerOverlay />
      {session?.user && messenger?.popoverRoomId && (
        <ChatPopover
          roomId={messenger.popoverRoomId}
          onClose={messenger.closePopover}
        />
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
