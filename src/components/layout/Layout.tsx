import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const Layout = () => {
  return (
    <>
      <Navbar />
      {/* Outlet renders the child route (Home, Dashboard, etc).
         We don't add padding here because your pages (Landing, Home)
         have full-screen background images that need to touch the top.
      */}
      <Box
        component="div"
        sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
      >
        <Outlet />
      </Box>
    </>
  );
};
