import { Box } from '@mui/material';
import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { MessengerProvider } from '../../context/MessengerContext';
import {
  useLayoutDocumentScrollLock,
  useLayoutLastActivePing,
} from './useLayoutLifecycleEffects';
import { useLayoutShellModel } from './useLayoutShellModel';
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
  useLayoutDocumentScrollLock();
  useLayoutLastActivePing();
  const {
    session,
    messenger,
    rootShellSx,
    rootBgcolor,
    scrollContainerSx,
    showFooter,
    showMessengerUi,
    showPopover,
  } = useLayoutShellModel();

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
      {showFooter && (
        <Box
          component="footer"
          data-docked-footer
          sx={(theme) => ({
            flexShrink: 0,
            position: 'relative',
            isolation: 'isolate',
            /**
             * Match app-bar tier so footer dropdowns stay above the primary scroll
             * column. Main pages use backdrop blur / elevated surfaces (e.g. Directory)
             * that can otherwise composite above a sibling with z-index 2.
             */
            zIndex: theme.zIndex.appBar,
          })}
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
      {showPopover && messenger?.popoverRoomId ? (
        <Suspense fallback={null}>
          <ChatPopover
            roomId={messenger.popoverRoomId}
            onClose={messenger.closePopover}
            session={session}
          />
        </Suspense>
      ) : null}
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
