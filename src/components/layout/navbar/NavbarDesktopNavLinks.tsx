import { Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type NavbarDesktopNavLinksProps = {
  isMobile: boolean;
  isAdmin: boolean;
  showAuthedHeader: boolean;
  chatEnabled: boolean;
  dashboardEnabled: boolean;
  directoryEnabled: boolean;
  eventsEnabled: boolean;
  feedEnabled: boolean;
  storeEnabled: boolean;
  isChatActive: boolean;
  isDashboardActive: boolean;
  isDirectoryActive: boolean;
  isEventsActive: boolean;
  isFeedActive: boolean;
  storeUrl: string;
};

export const NavbarDesktopNavLinks = ({
  isMobile,
  isAdmin,
  showAuthedHeader,
  chatEnabled,
  dashboardEnabled,
  directoryEnabled,
  eventsEnabled,
  feedEnabled,
  storeEnabled,
  isChatActive,
  isDashboardActive,
  isDirectoryActive,
  isEventsActive,
  isFeedActive,
  storeUrl,
}: NavbarDesktopNavLinksProps) => {
  if (isMobile) return null;

  return (
    <Box component="span" sx={{ display: 'contents' }}>
      {storeEnabled && (
        <Button
          component="a"
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: 'rgba(255,255,255,0.85)',
            textDecoration: 'none',
            textTransform: 'none',
            fontSize: '1rem',
          }}
        >
          Store
        </Button>
      )}
      {showAuthedHeader && (
        <>
          {feedEnabled && (
            <Button
              component={RouterLink}
              to="/feed"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                textTransform: 'none',
                fontSize: '1rem',
                ...(isFeedActive && {
                  color: 'white',
                  borderBottom: '2px solid rgba(255,255,255,0.6)',
                  borderRadius: 0,
                  '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                }),
              }}
            >
              Feed
            </Button>
          )}
          {directoryEnabled && (
            <Button
              component={RouterLink}
              to="/directory"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                textTransform: 'none',
                fontSize: '1rem',
                ...(isDirectoryActive && {
                  color: 'white',
                  borderBottom: '2px solid rgba(255,255,255,0.6)',
                  borderRadius: 0,
                  '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                }),
              }}
            >
              Directory
            </Button>
          )}
          {eventsEnabled && (
            <Button
              component={RouterLink}
              to="/events"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                textTransform: 'none',
                fontSize: '1rem',
                ...(isEventsActive && {
                  color: 'white',
                  borderBottom: '2px solid rgba(255,255,255,0.6)',
                  borderRadius: 0,
                  '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                }),
              }}
            >
              Events
            </Button>
          )}
          {dashboardEnabled && (
            <Button
              component={RouterLink}
              to="/dashboard"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                textTransform: 'none',
                fontSize: '1rem',
                ...(isDashboardActive && {
                  color: 'white',
                  borderBottom: '2px solid rgba(255,255,255,0.6)',
                  borderRadius: 0,
                  '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                }),
              }}
            >
              Dashboard
            </Button>
          )}
          {chatEnabled && (
            <Button
              component={RouterLink}
              to="/chat-full"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                textTransform: 'none',
                fontSize: '1rem',
                ...(isChatActive && {
                  color: 'white',
                  borderBottom: '2px solid rgba(255,255,255,0.6)',
                  borderRadius: 0,
                  '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                }),
              }}
            >
              Chat
            </Button>
          )}
        </>
      )}
      {isAdmin && (
        <Button
          component={RouterLink}
          to="/admin"
          sx={{
            color: 'warning.main',
            textTransform: 'none',
            fontSize: '1rem',
          }}
        >
          Admin
        </Button>
      )}
    </Box>
  );
};
