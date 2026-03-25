import { Box, Button, Drawer, Stack, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink, type Location } from 'react-router-dom';
import { GlobalNavAuthenticatedPrimary } from './GlobalNavAuthenticatedPrimary';
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
  isGroupsActive: boolean;
  path: string;
  storeUrl: string;
  location: Location;
  sessionUserId: string | undefined | null;
};

/**
 * Optional mobile drawer composition — same canonical primary nav as `Navbar` when used.
 */
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
  isGroupsActive,
  path,
  storeUrl,
  location,
  sessionUserId,
}: NavbarMobileDrawerProps) => {
  const theme = useTheme();
  const isLightNav = theme.palette.mode === 'light';
  const drawerLinkColor = isLightNav ? 'text.primary' : 'white';
  const drawerActiveNavSx = isLightNav
    ? {
        bgcolor: alpha(theme.palette.primary.main, 0.12),
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.18) },
      }
    : {
        bgcolor: 'rgba(156,187,217,0.26)',
        '&:hover': { bgcolor: 'rgba(141,188,229,0.34)' },
      };

  return (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: {
          width: 280,
          bgcolor: isLightNav
            ? theme.palette.background.paper
            : 'rgba(18, 18, 18, 0.98)',
          borderRight: isLightNav
            ? `1px solid ${theme.palette.divider}`
            : '1px solid rgba(156,187,217,0.18)',
        },
      }}
    >
      <Box sx={{ py: 2, overflow: 'auto' }}>
        <Stack component="nav" spacing={0} sx={{ px: 1 }}>
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
                  color: drawerLinkColor,
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
                    color: drawerLinkColor,
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
                to="/signin"
                onClick={() => setDrawerOpen(false)}
                sx={{
                  justifyContent: 'flex-start',
                  color: drawerLinkColor,
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
              <GlobalNavAuthenticatedPrimary
                variant="drawer"
                path={path}
                showAuthedHeader={showAuthedHeader}
                feedEnabled={feedEnabled}
                directoryEnabled={directoryEnabled}
                chatEnabled={chatEnabled}
                dashboardEnabled={dashboardEnabled}
                eventsEnabled={eventsEnabled}
                sessionUserId={sessionUserId}
                drawerLinkColor={drawerLinkColor}
                drawerActiveNavSx={drawerActiveNavSx}
                onDrawerNavigate={() => setDrawerOpen(false)}
              />
              {storeEnabled && (
                <Button
                  component="a"
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: drawerLinkColor,
                    textTransform: 'none',
                    py: 1.5,
                  }}
                >
                  Store
                </Button>
              )}
              {isAdmin ? (
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
              ) : null}
            </>
          )}
        </Stack>

        <NavbarMobileDrawerExplore
          showAuthedHeader={showAuthedHeader}
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
