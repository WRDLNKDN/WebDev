import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

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
