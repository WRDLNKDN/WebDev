import { Box, Button, Drawer, Link, Stack } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Session } from '@supabase/supabase-js';
import { Link as RouterLink, type Location } from 'react-router-dom';
import { NavbarDrawerAuthedPrimary } from './NavbarDrawerAuthedPrimary';
import { NavbarMobileDrawerExplore } from './NavbarMobileDrawerExplore';
import { NavbarMobileDrawerLegal } from './NavbarMobileDrawerLegal';

export type NavbarMobileDrawerProps = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  showAuthedHeader: boolean;
  session: Session | null;
  productionComingSoon: boolean;
  isAdminActive: boolean;
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
  location: Location;
  drawerPaperSx: SxProps<Theme>;
  drawerLinkColor: string;
  drawerActiveNavSx: SxProps<Theme>;
};

/** Mobile nav drawer: single composition used by `Navbar` (guest rules match main app bar). */
export const NavbarMobileDrawer = ({
  drawerOpen,
  setDrawerOpen,
  showAuthedHeader,
  session,
  productionComingSoon,
  isAdminActive,
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
  location,
  drawerPaperSx,
  drawerLinkColor,
  drawerActiveNavSx,
}: NavbarMobileDrawerProps) => {
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
          {!session && (
            <>
              {(!productionComingSoon || isAdminActive) && (
                <>
                  <Button
                    component={RouterLink}
                    to="/signin"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      justifyContent: 'flex-start',
                      color: drawerLinkColor,
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1.5,
                      minHeight: 44,
                      touchAction: 'manipulation',
                    }}
                  >
                    Sign in
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
                        fontWeight: 600,
                        py: 1.5,
                        minHeight: 44,
                        touchAction: 'manipulation',
                      }}
                    >
                      Join
                    </Button>
                  )}
                </>
              )}
              {storeEnabled && (
                <Link
                  href="/store"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="none"
                  onClick={() => {
                    window.setTimeout(() => setDrawerOpen(false), 0);
                  }}
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    color: drawerLinkColor,
                    textTransform: 'none',
                    py: 1.5,
                    px: 1,
                    minHeight: 44,
                    touchAction: 'manipulation',
                  }}
                >
                  Store
                </Link>
              )}
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
              sessionUserId={session?.user?.id}
              drawerLinkColor={drawerLinkColor}
              drawerActiveNavSx={drawerActiveNavSx}
              onDrawerNavigate={() => setDrawerOpen(false)}
              storeEnabled={storeEnabled}
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
