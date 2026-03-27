import { Button } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { isGlobalNavChatActive } from '../../../lib/navigation/globalNav';
import { getStoreExternalUrl } from '../../../lib/marketing/storefront';
import { chatUiForMember } from '../../../lib/utils/chatUiForMember';

const KICKSTARTER_URL =
  'https://www.kickstarter.com/projects/wrdlnkdn/wrdlnkdn-business-but-weirder-0';

export type GlobalNavAuthenticatedPrimaryProps = {
  variant: 'desktop' | 'drawer';
  path: string;
  showAuthedHeader: boolean;
  feedEnabled: boolean;
  directoryEnabled: boolean;
  chatEnabled: boolean;
  dashboardEnabled: boolean;
  eventsEnabled: boolean;
  sessionUserId: string | undefined | null;
  /** Desktop toolbar only (lg breakpoint typography). */
  isCompactDesktop?: boolean;
  drawerLinkColor?: string;
  drawerActiveNavSx?: SxProps<Theme>;
  onDrawerNavigate?: () => void;
  storeEnabled: boolean;
};

type StoreNavParams = {
  storeEnabled: boolean;
  variant: 'desktop' | 'drawer';
  isStoreRoute: boolean;
  desktopFontSize: string;
  desktopPx: number;
  drawerLinkColor: string;
  onDrawerNavigate?: () => void;
  desktopActiveSx: (active: boolean) => Record<string, unknown>;
  drawerActiveWrap: (active: boolean) => SxProps<Theme> | Record<string, never>;
};

/**
 * Authenticated primary nav: Feed → Directory → Chat → Profile → Events.
 * Store is rendered beside the brand in the main navbar, and in the mobile drawer.
 * Renders nothing when unauthenticated. Omitted flags produce no nodes (no placeholders).
 */
export const GlobalNavAuthenticatedPrimary = ({
  variant,
  path,
  showAuthedHeader,
  feedEnabled,
  directoryEnabled,
  chatEnabled,
  dashboardEnabled,
  eventsEnabled,
  sessionUserId,
  isCompactDesktop = false,
  drawerLinkColor = 'white',
  drawerActiveNavSx,
  onDrawerNavigate,
  storeEnabled,
}: GlobalNavAuthenticatedPrimaryProps) => {
  const isFeedActive = path === '/feed';
  const isDirectoryActive =
    path === '/directory' || path.startsWith('/directory');
  const isChatActive = isGlobalNavChatActive(path);
  const isDashboardActive =
    path === '/dashboard' || path.startsWith('/dashboard/');
  const isEventsActive = path === '/events' || path.startsWith('/events/');
  const isStoreRoute = path === '/store' || path.startsWith('/store/');
  const showChat = chatUiForMember(chatEnabled, sessionUserId);

  const desktopFontSize = isCompactDesktop ? '0.92rem' : '1rem';
  const desktopPx = isCompactDesktop ? 1 : 1.5;

  const desktopActiveSx = (active: boolean) =>
    active
      ? {
          color: 'white' as const,
          '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
        }
      : {};

  const drawerActiveWrap = (active: boolean) =>
    active && drawerActiveNavSx ? drawerActiveNavSx : {};

  const storeButton = renderGlobalNavStoreButton({
    storeEnabled,
    variant,
    isStoreRoute,
    desktopFontSize,
    desktopPx,
    drawerLinkColor,
    onDrawerNavigate,
    desktopActiveSx,
    drawerActiveWrap,
  });
  const kickstarterButton = renderGlobalNavKickstarterButton({
    storeEnabled,
    variant,
    desktopFontSize,
    desktopPx,
    drawerLinkColor,
    onDrawerNavigate,
    drawerActiveWrap,
  });

  if (!showAuthedHeader) {
    return null;
  }

  return (
    <>
      {feedEnabled ? (
        <Button
          key="global-nav-feed"
          component={RouterLink}
          to="/feed"
          onClick={variant === 'drawer' ? onDrawerNavigate : undefined}
          sx={{
            color: 'rgba(255,255,255,0.85)',
            textTransform: 'none',
            ...(variant === 'desktop'
              ? {
                  fontSize: desktopFontSize,
                  px: desktopPx,
                  ...desktopActiveSx(isFeedActive),
                }
              : {
                  justifyContent: 'flex-start',
                  color: drawerLinkColor,
                  py: 1.5,
                  ...drawerActiveWrap(isFeedActive),
                }),
          }}
        >
          Feed
        </Button>
      ) : null}
      {directoryEnabled ? (
        <Button
          key="global-nav-directory"
          component={RouterLink}
          to="/directory"
          onClick={variant === 'drawer' ? onDrawerNavigate : undefined}
          sx={{
            color: 'rgba(255,255,255,0.85)',
            textTransform: 'none',
            ...(variant === 'desktop'
              ? {
                  fontSize: desktopFontSize,
                  px: desktopPx,
                  ...desktopActiveSx(isDirectoryActive),
                }
              : {
                  justifyContent: 'flex-start',
                  color: drawerLinkColor,
                  py: 1.5,
                  ...drawerActiveWrap(isDirectoryActive),
                }),
          }}
        >
          Directory
        </Button>
      ) : null}
      {showChat ? (
        <Button
          key="global-nav-chat"
          component={RouterLink}
          to="/chat-full"
          onClick={variant === 'drawer' ? onDrawerNavigate : undefined}
          sx={{
            color: 'rgba(255,255,255,0.85)',
            textTransform: 'none',
            ...(variant === 'desktop'
              ? {
                  fontSize: desktopFontSize,
                  px: desktopPx,
                  ...desktopActiveSx(isChatActive),
                }
              : {
                  justifyContent: 'flex-start',
                  color: drawerLinkColor,
                  py: 1.5,
                  ...drawerActiveWrap(isChatActive),
                }),
          }}
        >
          Chat
        </Button>
      ) : null}
      {dashboardEnabled ? (
        <Button
          key="global-nav-profile"
          component={RouterLink}
          to="/dashboard"
          onClick={variant === 'drawer' ? onDrawerNavigate : undefined}
          sx={{
            color: 'rgba(255,255,255,0.85)',
            textTransform: 'none',
            ...(variant === 'desktop'
              ? {
                  fontSize: desktopFontSize,
                  px: desktopPx,
                  ...desktopActiveSx(isDashboardActive),
                }
              : {
                  justifyContent: 'flex-start',
                  color: drawerLinkColor,
                  py: 1.5,
                  ...drawerActiveWrap(isDashboardActive),
                }),
          }}
        >
          Profile
        </Button>
      ) : null}
      {eventsEnabled ? (
        <Button
          key="global-nav-events"
          component={RouterLink}
          to="/events"
          onClick={variant === 'drawer' ? onDrawerNavigate : undefined}
          sx={{
            color: 'rgba(255,255,255,0.85)',
            textTransform: 'none',
            ...(variant === 'desktop'
              ? {
                  fontSize: desktopFontSize,
                  px: desktopPx,
                  ...desktopActiveSx(isEventsActive),
                }
              : {
                  justifyContent: 'flex-start',
                  color: drawerLinkColor,
                  py: 1.5,
                  ...drawerActiveWrap(isEventsActive),
                }),
          }}
        >
          Events
        </Button>
      ) : null}
      {variant === 'drawer' ? storeButton : null}
      {variant === 'drawer' ? kickstarterButton : null}
    </>
  );
};

function renderGlobalNavStoreButton({
  storeEnabled,
  variant,
  isStoreRoute,
  desktopFontSize,
  desktopPx,
  drawerLinkColor,
  onDrawerNavigate,
  desktopActiveSx,
  drawerActiveWrap,
}: StoreNavParams): ReactNode {
  if (!storeEnabled) return null;
  const storeHref = getStoreExternalUrl();

  const sharedButtonSx =
    variant === 'desktop'
      ? {
          fontSize: desktopFontSize,
          px: desktopPx,
          ...desktopActiveSx(isStoreRoute),
        }
      : {
          justifyContent: 'flex-start',
          color: drawerLinkColor,
          py: 1.5,
          ...drawerActiveWrap(isStoreRoute),
        };

  return (
    <Button
      key="global-nav-store"
      component="a"
      href={storeHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        // Close drawer after navigation when rendering inside the mobile drawer
        if (variant === 'drawer' && onDrawerNavigate) {
          globalThis.setTimeout(onDrawerNavigate, 0);
        }
      }}
      aria-label="Store, opens storefront in a new tab"
      sx={{
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'none',
        minWidth: 0,
        whiteSpace: 'nowrap',
        ...sharedButtonSx,
        '&:visited': {
          color:
            variant === 'desktop' ? 'rgba(255,255,255,0.85)' : drawerLinkColor,
        },
      }}
    >
      Store
    </Button>
  );
}

function renderGlobalNavKickstarterButton({
  storeEnabled,
  variant,
  desktopFontSize,
  desktopPx,
  drawerLinkColor,
  onDrawerNavigate,
  drawerActiveWrap,
}: Omit<StoreNavParams, 'isStoreRoute' | 'desktopActiveSx'>): ReactNode {
  if (!storeEnabled) return null;

  const sharedButtonSx =
    variant === 'desktop'
      ? {
          fontSize: desktopFontSize,
          px: desktopPx,
        }
      : {
          justifyContent: 'flex-start',
          color: drawerLinkColor,
          py: 1.5,
          ...drawerActiveWrap(false),
        };

  return (
    <Button
      key="global-nav-kickstarter"
      component="a"
      href={KICKSTARTER_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        if (variant === 'drawer' && onDrawerNavigate) {
          globalThis.setTimeout(onDrawerNavigate, 0);
        }
      }}
      aria-label="Kickstarter, opens in a new tab"
      sx={{
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'none',
        minWidth: 0,
        whiteSpace: 'nowrap',
        ...sharedButtonSx,
        '&:visited': {
          color:
            variant === 'desktop' ? 'rgba(255,255,255,0.85)' : drawerLinkColor,
        },
      }}
    >
      Kickstarter
    </Button>
  );
}
