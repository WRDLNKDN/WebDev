import { Box, Button, Drawer, Stack } from '@mui/material';
import { Link as RouterLink, type Location } from 'react-router-dom';
import { NavbarMobileDrawerExplore } from './NavbarMobileDrawerExplore';
import { NavbarMobileDrawerLegal } from './NavbarMobileDrawerLegal';

type NavbarMobileDrawerProps = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  isAdmin: boolean;
  showAuthedHeader: boolean;
  isJoinActive: boolean;
  dashboardEnabled: boolean;
  directoryEnabled: boolean;
  eventsEnabled: boolean;
  groupsEnabled: boolean;
  feedEnabled: boolean;
  storeEnabled: boolean;
  chatEnabled: boolean;
  gamesEnabled: boolean;
  isDashboardActive: boolean;
  isDirectoryActive: boolean;
  isEventsActive: boolean;
  isFeedActive: boolean;
  isGroupsActive: boolean;
  path: string;
  storeUrl: string;
  location: Location;
};

export const NavbarMobileDrawer = ({
  drawerOpen,
  setDrawerOpen,
  isAdmin,
  showAuthedHeader,
  isJoinActive,
  dashboardEnabled,
  directoryEnabled,
  eventsEnabled,
  groupsEnabled,
  feedEnabled,
  storeEnabled,
  chatEnabled,
  gamesEnabled,
  isDashboardActive,
  isDirectoryActive,
  isEventsActive,
  isFeedActive,
  isGroupsActive,
  path,
  storeUrl,
  location,
}: NavbarMobileDrawerProps) => {
  return (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: {
          width: 280,
          bgcolor: 'rgba(18, 18, 18, 0.98)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        },
      }}
    >
      <Box sx={{ py: 2, overflow: 'auto' }}>
        <Stack component="nav" spacing={0} sx={{ px: 1 }}>
          {isAdmin && (
            <Button
              component={RouterLink}
              to="/admin"
              onClick={() => setDrawerOpen(false)}
              sx={{
                justifyContent: 'flex-start',
                color: 'warning.main',
                textTransform: 'none',
                py: 1.5,
              }}
            >
              Admin
            </Button>
          )}
          {!showAuthedHeader && (
            <>
              <Button
                component="a"
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDrawerOpen(false)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'white',
                  textTransform: 'none',
                  py: 1.5,
                }}
              >
                Store
              </Button>
              {!isJoinActive && (
                <Button
                  component={RouterLink}
                  to="/join"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'white',
                    textTransform: 'none',
                    py: 1.5,
                    minHeight: 44,
                    touchAction: 'manipulation',
                  }}
                >
                  Join
                </Button>
              )}
              <Button
                component={RouterLink}
                to="/join"
                onClick={() => setDrawerOpen(false)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'white',
                  textTransform: 'none',
                  py: 1.5,
                  minHeight: 44,
                  touchAction: 'manipulation',
                }}
              >
                Sign in
              </Button>
            </>
          )}
          {showAuthedHeader && (
            <>
              {storeEnabled && (
                <Button
                  component="a"
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'white',
                    textTransform: 'none',
                    py: 1.5,
                  }}
                >
                  Store
                </Button>
              )}
              {feedEnabled && (
                <Button
                  component={RouterLink}
                  to="/feed"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'white',
                    textTransform: 'none',
                    py: 1.5,
                    ...(isFeedActive && {
                      bgcolor: 'rgba(255,255,255,0.12)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
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
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'white',
                    textTransform: 'none',
                    py: 1.5,
                    ...(isDirectoryActive && {
                      bgcolor: 'rgba(255,255,255,0.12)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
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
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'white',
                    textTransform: 'none',
                    py: 1.5,
                    ...(isEventsActive && {
                      bgcolor: 'rgba(255,255,255,0.12)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
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
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'white',
                    textTransform: 'none',
                    py: 1.5,
                    ...(isDashboardActive && {
                      bgcolor: 'rgba(255,255,255,0.12)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
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
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'white',
                    textTransform: 'none',
                    py: 1.5,
                    ...(path === '/chat-full' || path.startsWith('/chat-full/')
                      ? {
                          bgcolor: 'rgba(255,255,255,0.12)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                        }
                      : {}),
                  }}
                >
                  Chat
                </Button>
              )}
            </>
          )}
        </Stack>

        <NavbarMobileDrawerExplore
          showAuthedHeader={showAuthedHeader}
          eventsEnabled={eventsEnabled}
          groupsEnabled={groupsEnabled}
          gamesEnabled={gamesEnabled}
          isGroupsActive={isGroupsActive}
          location={location}
          onNavigate={() => setDrawerOpen(false)}
        />

        <NavbarMobileDrawerLegal onNavigate={() => setDrawerOpen(false)} />
      </Box>
    </Drawer>
  );
};
