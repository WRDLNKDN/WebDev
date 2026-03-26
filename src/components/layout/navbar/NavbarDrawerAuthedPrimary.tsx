import { Button } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { openSameOriginPathInNewTab } from '../../../lib/navigation/openSameOriginInNewTab';
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
          type="button"
          variant="text"
          onClick={() => {
            openSameOriginPathInNewTab('/store');
            window.setTimeout(onDrawerNavigate, 0);
          }}
          aria-label="Store, opens in a new tab"
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
        </Button>
      )}
    </>
  );
};
