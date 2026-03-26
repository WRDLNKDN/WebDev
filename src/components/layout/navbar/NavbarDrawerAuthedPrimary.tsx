import { Button } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { GlobalNavAuthenticatedPrimary } from './GlobalNavAuthenticatedPrimary';

export type NavbarDrawerAuthedPrimaryProps = {
  path: string;
  showAuthedHeader: boolean;
  feedEnabled: boolean;
  directoryEnabled: boolean;
  chatEnabled: boolean;
  dashboardEnabled: boolean;
  eventsEnabled: boolean;
  sessionUserId: string | undefined | null;
  drawerLinkColor: string;
  drawerActiveNavSx: SxProps<Theme>;
  onDrawerNavigate: () => void;
  storeEnabled: boolean;
  isAdmin: boolean;
};

/** Primary authenticated links inside the mobile nav drawer (shared by `Navbar` and `NavbarMobileDrawer`). */
export const NavbarDrawerAuthedPrimary = ({
  path,
  showAuthedHeader,
  feedEnabled,
  directoryEnabled,
  chatEnabled,
  dashboardEnabled,
  eventsEnabled,
  sessionUserId,
  drawerLinkColor,
  drawerActiveNavSx,
  onDrawerNavigate,
  storeEnabled,
  isAdmin,
}: NavbarDrawerAuthedPrimaryProps) => {
  return (
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
        onDrawerNavigate={onDrawerNavigate}
      />
      {storeEnabled && (
        <Button
          component={RouterLink}
          to="/store"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onDrawerNavigate}
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
          onClick={onDrawerNavigate}
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
  );
};
