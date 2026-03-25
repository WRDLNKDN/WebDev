import { Box, Button, Drawer, Stack, useTheme } from '@mui/material';
import { Link as RouterLink, type Location } from 'react-router-dom';
import { NavbarDrawerAuthedPrimary } from './NavbarDrawerAuthedPrimary';
import { getNavbarDrawerChrome } from './navbarDrawerChrome';
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
  const { drawerPaperSx, drawerLinkColor, drawerActiveNavSx } =
    getNavbarDrawerChrome(theme);

  return (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: drawerPaperSx,
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
            <NavbarDrawerAuthedPrimary
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
              storeEnabled={storeEnabled}
              storeHref={storeUrl}
              isAdmin={isAdmin}
            />
          )}
        </Stack>

        <NavbarMobileDrawerExplore
          showAuthedHeader={showAuthedHeader}
          groupsEnabled={groupsEnabled}
          gamesEnabled={gamesEnabled}
          isGroupsActive={isGroupsActive}
          location={location}
          onNavigate={() => setDrawerOpen(false)}
          drawerActiveNavSx={drawerActiveNavSx}
        />

        <NavbarMobileDrawerLegal onNavigate={() => setDrawerOpen(false)} />
      </Box>
    </Drawer>
  );
};
