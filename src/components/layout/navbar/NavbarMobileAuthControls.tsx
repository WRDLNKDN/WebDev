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

type NavbarMobileAuthControlsProps = {
  isMobile: boolean;
  path: string;
  session: Session | null;
  sessionLoaded: boolean;
  onboardingLoaded: boolean;
  showAuthedHeader: boolean;
  isJoinActive: boolean;
  dashboardEnabled: boolean;
  notificationsUnread: number;
  avatarUrl: string | null;
  setDrawerOpen: (open: boolean) => void;
  setAvatarMenuAnchor: (el: HTMLElement | null) => void;
  /** When wired to the same menu as desktop, reflect open state for aria-expanded. */
  avatarMenuOpen?: boolean;
};

export const NavbarMobileAuthControls = ({
  isMobile,
  path,
  session,
  sessionLoaded,
  onboardingLoaded,
  showAuthedHeader,
  isJoinActive,
  dashboardEnabled,
  notificationsUnread,
  avatarUrl,
  setDrawerOpen,
  setAvatarMenuAnchor,
  avatarMenuOpen = false,
}: NavbarMobileAuthControlsProps) => {
  if (!isMobile) return null;

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
        pointerEvents: 'auto',
        touchAction: 'manipulation',
      }}
    >
      {path === '/auth/callback' ? null : !sessionLoaded ||
        (session && !onboardingLoaded) ? (
        <CircularProgress
          size={16}
          sx={{ color: 'text.secondary' }}
          aria-label="Loading"
        />
      ) : !showAuthedHeader ? (
        <>
          {!isJoinActive && (
            <Button
              component={RouterLink}
              to="/join"
              onClick={() => setDrawerOpen(false)}
              aria-label="Join"
              size="small"
              sx={{
                minHeight: 40,
                minWidth: 'auto',
                px: 1.25,
                color: 'rgba(255,255,255,0.96)',
                textTransform: 'none',
                fontSize: '0.9375rem',
                touchAction: 'manipulation',
                pointerEvents: 'auto',
                '&:hover': {
                  color: 'white',
                  bgcolor: 'rgba(56,132,210,0.14)',
                },
              }}
            >
              Join
            </Button>
          )}
          <Button
            component={RouterLink}
            to="/signin"
            onClick={() => setDrawerOpen(false)}
            aria-label="Sign in"
            size="small"
            sx={{
              minHeight: 40,
              minWidth: 'auto',
              px: 1.25,
              color: 'rgba(255,255,255,0.96)',
              textTransform: 'none',
              fontSize: '0.9375rem',
              touchAction: 'manipulation',
              pointerEvents: 'auto',
              '&:hover': {
                color: 'white',
                bgcolor: 'rgba(56,132,210,0.14)',
              },
            }}
          >
            Sign in
          </Button>
        </>
      ) : (
        <>
          {showAuthedHeader && dashboardEnabled && (
            <Tooltip
              title={
                notificationsUnread > 0
                  ? `${notificationsUnread} unread notifications`
                  : 'Notifications'
              }
            >
              <IconButton
                component={RouterLink}
                to="/dashboard/notifications"
                aria-label={
                  notificationsUnread > 0
                    ? `${notificationsUnread} unread notifications`
                    : 'Notifications'
                }
                sx={{
                  color: 'white',
                  ...(path === '/dashboard/notifications' && {
                    bgcolor: 'rgba(156,187,217,0.26)',
                    '&:hover': { bgcolor: 'rgba(141,188,229,0.34)' },
                  }),
                }}
              >
                <Badge
                  badgeContent={
                    notificationsUnread > 0 ? notificationsUnread : undefined
                  }
                  color="error"
                >
                  <NotificationsIcon sx={{ fontSize: 22 }} />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Account menu">
            <IconButton
              type="button"
              onClick={(e) => setAvatarMenuAnchor(e.currentTarget)}
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={avatarMenuOpen}
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
          </Tooltip>
        </>
      )}
    </Stack>
  );
};
