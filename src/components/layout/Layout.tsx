import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { Footer } from './Footer';
import { Navbar } from './Navbar';
import { UatBanner } from './UatBanner';

const PAGE_BG = {
  backgroundImage: 'url("/assets/background.png")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
};

export const Layout = () => {
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
    </>
  );
};
