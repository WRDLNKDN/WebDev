/**
 * NavbarDesktopAuthControls — desktop right-side auth: Join/Sign in (guest)
 * or notifications + avatar menu (authed).
 *
 * Extracted from Navbar.tsx to keep it focused on composition.
 * Coming-soon mode hides guest controls (no Join/Sign in) except on admin routes.
 */
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { Link as RouterLink } from 'react-router-dom';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';

type NavbarDesktopAuthControlsProps = {
  path: string;
  session: Session | null;
  sessionLoaded: boolean;
  onboardingLoaded: boolean;
  showAuthedHeader: boolean;
  comingSoon: boolean;
  isAdminActive: boolean;
  isJoinActive: boolean;
  dashboardEnabled: boolean;
  notificationsUnread: number;
  avatarUrl: string | null;
  avatarMenuAnchor: HTMLElement | null;
  setAvatarMenuAnchor: (el: HTMLElement | null) => void;
  openJoin: () => void;
  openSignIn: () => void;
};

export const NavbarDesktopAuthControls = ({
  path,
  session,
  sessionLoaded,
  onboardingLoaded,
  showAuthedHeader,
  comingSoon,
  isAdminActive,
  isJoinActive,
  dashboardEnabled,
  notificationsUnread,
  avatarUrl,
  avatarMenuAnchor,
  setAvatarMenuAnchor,
  openJoin,
  openSignIn,
}: NavbarDesktopAuthControlsProps) => {
  // While on /auth/callback, suppress spinner — AuthCallback handles its own loading.
  if (path === '/auth/callback') return null;

  const guestControlsVisible = !comingSoon || isAdminActive;

  const guestButtonSx = {
    color: 'rgba(255,255,255,0.96)',
    textTransform: 'none' as const,
    fontSize: '1rem',
    fontWeight: 600,
    minWidth: 0,
    px: 1,
    '&:hover': {
      bgcolor: 'rgba(56,132,210,0.14)',
      color: 'white',
    },
  };

  // Loading spinner: session or onboarding not yet resolved.
  if (!sessionLoaded || (session && !onboardingLoaded)) {
    return (
      <CircularProgress
        size={16}
        sx={{ color: 'text.secondary' }}
        aria-label="Loading"
      />
    );
  }

  // Guest — not signed in.
  if (!session) {
    if (!guestControlsVisible) return null;
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        {!isJoinActive && (
          <Button
            component="button"
            type="button"
            onClick={openJoin}
            sx={guestButtonSx}
          >
            Join
          </Button>
        )}
        <Button
          component="button"
          type="button"
          onClick={openSignIn}
          sx={guestButtonSx}
        >
          Sign in
        </Button>
      </Stack>
    );
  }

  // Authenticated.
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {showAuthedHeader && dashboardEnabled && (
        <Tooltip
          title={
            notificationsUnread > 0
              ? `${notificationsUnread} unread notifications`
              : 'Notifications'
          }
        >
          <span>
            <IconButton
              component={RouterLink}
              to="/dashboard/notifications"
              aria-label={
                notificationsUnread > 0
                  ? `${notificationsUnread} unread notifications`
                  : 'Notifications'
              }
              sx={{
                color: 'rgba(255,255,255,0.85)',
                ...(path === '/dashboard/notifications' && {
                  color: 'white',
                  bgcolor: 'rgba(156,187,217,0.26)',
                  '&:hover': { bgcolor: 'rgba(141,188,229,0.34)' },
                }),
              }}
            >
              <Badge
                badgeContent={notificationsUnread > 0 ? notificationsUnread : undefined}
                color="error"
              >
                <NotificationsIcon sx={{ fontSize: 22 }} />
              </Badge>
            </IconButton>
          </span>
        </Tooltip>
      )}

      {/* Avatar menu button — hidden in coming-soon unless on admin route */}
      {(!comingSoon || isAdminActive) && (
        <Tooltip title="Account menu" disableInteractive>
          <Box
            component="span"
            sx={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
          >
            <IconButton
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAvatarMenuAnchor(e.currentTarget);
              }}
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={Boolean(avatarMenuAnchor)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                p: 0.25,
                color: 'inherit',
                borderRadius: 9999,
                '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.4)',
                  p: '1px',
                  flexShrink: 0,
                }}
              >
                <ProfileAvatar
                  src={avatarUrl ?? undefined}
                  alt={session?.user?.user_metadata?.full_name || 'User'}
                  size="small"
                  sx={{ width: 24, height: 24 }}
                />
              </Box>
              <KeyboardArrowDownIcon
                sx={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}
              />
            </IconButton>
          </Box>
        </Tooltip>
      )}
    </Stack>
  );
};
