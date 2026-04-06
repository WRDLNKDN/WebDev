/**
 * NavbarMobileDrawer — governed mobile navigation drawer.
 *
 * Authenticated primary nav is driven by AUTHED_PRIMARY_NAV config (IA order).
 * Feature-flagged items are omitted entirely — no placeholder, no layout shift.
 * Coming-soon mode hides guest controls unless on admin routes.
 */
import { Box, Button, Drawer, Stack } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Session } from '@supabase/supabase-js';
import { Link as RouterLink, type Location } from 'react-router-dom';
import { useFeatureFlag } from '../../../context/FeatureFlagsContext';
import { getStoreExternalUrl } from '../../../lib/marketing/storefront';
import { AUTHED_PRIMARY_NAV, type NavItem } from './navConfig';
import { NavbarMobileDrawerExplore } from './NavbarMobileDrawerExplore';
import { NavbarMobileDrawerLegal } from './NavbarMobileDrawerLegal';

const KICKSTARTER_URL =
  'https://www.kickstarter.com/projects/wrdlnkdn/wrdlnkdn-business-but-weirder-0';

export type NavbarMobileDrawerProps = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  showAuthedHeader: boolean;
  session: Session | null;
  comingSoon: boolean;
  isAdminActive: boolean;
  isJoinActive: boolean;
  storeEnabled: boolean;
  gamesEnabled: boolean;
  groupsEnabled: boolean;
  isGroupsActive: boolean;
  path: string;
  location: Location;
  drawerPaperSx: SxProps<Theme>;
  drawerLinkColor: string;
  drawerActiveNavSx: SxProps<Theme>;
};

/** Single drawer nav item driven by config. Reads its own flag. */
const DrawerNavItem = ({
  item,
  path,
  drawerLinkColor,
  drawerActiveNavSx,
  onNavigate,
}: {
  item: NavItem;
  path: string;
  drawerLinkColor: string;
  drawerActiveNavSx: SxProps<Theme>;
  onNavigate: () => void;
}) => {
  const flagEnabled = useFeatureFlag(item.flagKey ?? '__always_true__');
  if (item.flagKey && !flagEnabled) return null;

  const isActive = item.isActive(path);

  return (
    <Button
      component={RouterLink}
      to={item.to}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      sx={{
        justifyContent: 'flex-start',
        color: drawerLinkColor,
        textTransform: 'none',
        fontWeight: isActive ? 700 : 600,
        py: 1.5,
        minHeight: 44,
        touchAction: 'manipulation',
        ...(isActive ? drawerActiveNavSx : {}),
      }}
    >
      {item.label}
    </Button>
  );
};

export const NavbarMobileDrawer = ({
  drawerOpen,
  setDrawerOpen,
  showAuthedHeader,
  session,
  comingSoon,
  isAdminActive,
  isJoinActive,
  storeEnabled,
  gamesEnabled,
  groupsEnabled,
  isGroupsActive,
  path,
  location,
  drawerPaperSx,
  drawerLinkColor,
  drawerActiveNavSx,
}: NavbarMobileDrawerProps) => {
  const storeExternalUrl = getStoreExternalUrl();
  const guestControlsVisible = !comingSoon || isAdminActive;
  const close = () => setDrawerOpen(false);

  return (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={close}
      PaperProps={{ sx: drawerPaperSx }}
    >
      <Box sx={{ py: 2, overflow: 'auto' }}>
        <Stack component="nav" spacing={0} sx={{ px: 1 }}>
          {/* Guest controls */}
          {!session && guestControlsVisible && (
            <>
              {!isJoinActive && (
                <Button
                  component={RouterLink}
                  to="/join"
                  onClick={close}
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
              <Button
                component={RouterLink}
                to="/signin"
                onClick={close}
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
            </>
          )}

          {/* Store links (guest or authed) */}
          {storeEnabled && (
            <>
              <Button
                component="a"
                href={KICKSTARTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => globalThis.setTimeout(close, 0)}
                aria-label="Kickstarter, opens in a new tab"
                sx={{
                  justifyContent: 'flex-start',
                  color: drawerLinkColor,
                  textTransform: 'none',
                  py: 1.5,
                  minHeight: 44,
                  touchAction: 'manipulation',
                }}
              >
                Kickstarter
              </Button>
              <Button
                component="a"
                href={storeExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => globalThis.setTimeout(close, 0)}
                aria-label="Store, opens storefront in a new tab"
                sx={{
                  justifyContent: 'flex-start',
                  color: drawerLinkColor,
                  textTransform: 'none',
                  py: 1.5,
                  minHeight: 44,
                  touchAction: 'manipulation',
                }}
              >
                Store
              </Button>
            </>
          )}

          {/* Authenticated primary nav — IA order from config */}
          {showAuthedHeader &&
            AUTHED_PRIMARY_NAV.map((item) => (
              <DrawerNavItem
                key={item.to}
                item={item}
                path={path}
                drawerLinkColor={drawerLinkColor}
                drawerActiveNavSx={drawerActiveNavSx}
                onNavigate={close}
              />
            ))}
        </Stack>

        {/* Explore section — groups, games, saved, etc. */}
        <NavbarMobileDrawerExplore
          showAuthedHeader={showAuthedHeader}
          groupsEnabled={groupsEnabled}
          gamesEnabled={gamesEnabled}
          isGroupsActive={isGroupsActive}
          location={location}
          onNavigate={close}
          drawerActiveNavSx={drawerActiveNavSx}
        />

        <NavbarMobileDrawerLegal onNavigate={close} />
      </Box>
    </Drawer>
  );
};
