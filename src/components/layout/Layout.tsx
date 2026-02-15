import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import {
  MessengerProvider,
  useMessenger,
} from '../../context/MessengerContext';
import { ChatPopover } from '../chat/ChatPopover';
import { ErrorBoundary } from './ErrorBoundary';
import { Footer } from './Footer';
import { UatBanner } from './UatBanner';
import { MessengerOverlay } from './MessengerOverlay';
import { Navbar } from './Navbar';

const PAGE_BG = {
  backgroundImage: 'url("/assets/background.png")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
};

const LayoutContent = () => {
  const messenger = useMessenger();

  return (
    <>
      <Navbar />
      <UatBanner />
      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ...PAGE_BG,
        }}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
        <Footer />
      </Box>
      <MessengerOverlay />
      {messenger?.popoverRoomId && (
        <ChatPopover
          roomId={messenger.popoverRoomId}
          onClose={messenger.closePopover}
        />
      )}
    </>
  );
};

export const Layout = () => {
  return (
    <MessengerProvider>
      <LayoutContent />
    </MessengerProvider>
  );
};
