import { Box } from '@mui/material';
import { useEffect } from 'react';
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
  const isHome = pathname === '/';
  const isJoin = pathname.startsWith('/join');

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

  return (
    <Box
      className="app-scroll-container"
      data-testid="app-scroll-container"
      sx={{
        height: '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...PAGE_BG,
      }}
    >
      <Navbar />
      <UatBanner />
      <Box
        component="main"
        data-testid="app-main"
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
      {!isHome && !isJoin && <Footer />}
      <MessengerOverlay />
      {messenger?.popoverRoomId && (
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
