import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { Link as RouterLink } from 'react-router-dom';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';

type NavbarDesktopAuthControlsProps = {
  isMobile: boolean;
  path: string;
  session: Session | null;
  sessionLoaded: boolean;
  onboardingLoaded: boolean;
  showAuthedHeader: boolean;
  isJoinActive: boolean;
  joinLoading: boolean;
  dashboardEnabled: boolean;
  notificationsUnread: number;
  avatarUrl: string | null;
  avatarMenuAnchor: HTMLElement | null;
  setAvatarMenuAnchor: (el: HTMLElement | null) => void;
  onOpenJoin: () => void;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  setDrawerOpen: (open: boolean) => void;
};

export const NavbarDesktopAuthControls = ({
  isMobile,
  path,
  session,
  sessionLoaded,
  onboardingLoaded,
  showAuthedHeader,
  isJoinActive,
  joinLoading,
  dashboardEnabled,
  notificationsUnread,
  avatarUrl,
  avatarMenuAnchor,
  setAvatarMenuAnchor,
  onOpenJoin,
  onOpenSignIn,
  onSignOut,
  setDrawerOpen,
}: NavbarDesktopAuthControlsProps) => {
  if (isMobile) return null;

  return (
    <Stack direction="row" spacing={2} alignItems="center">
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
              component="button"
              type="button"
              onClick={onOpenJoin}
              disabled={joinLoading}
              sx={{
                color: 'rgba(255,255,255,0.85)',
                textTransform: 'none',
                fontSize: '1rem',
                minWidth: 0,
                px: 1,
                '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
              }}
            >
              Join
            </Button>
          )}
          <Button
            component="button"
            type="button"
            onClick={onOpenSignIn}
            sx={{
              color: 'rgba(255,255,255,0.85)',
              textTransform: 'none',
              fontSize: '1rem',
              minWidth: 0,
              px: 1,
              '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
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
                  color: 'rgba(255,255,255,0.85)',
                  ...(path === '/dashboard/notifications' && {
                    color: 'white',
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
          </Tooltip>
          <Menu
            anchorEl={avatarMenuAnchor}
            open={Boolean(avatarMenuAnchor)}
            onClose={() => setAvatarMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1.5,
                  minWidth: 180,
                  borderRadius: 2,
                  bgcolor: 'rgba(30,30,30,0.98)',
                  border: '1px solid rgba(156,187,217,0.26)',
                },
              },
            }}
          >
            {dashboardEnabled && (
              <MenuItem
                component={RouterLink}
                to="/dashboard"
                onClick={() => {
                  setAvatarMenuAnchor(null);
                  setDrawerOpen(false);
                }}
                sx={{ py: 1.25 }}
              >
                Profile
              </MenuItem>
            )}
            {dashboardEnabled && (
              <MenuItem
                component={RouterLink}
                to="/dashboard/settings"
                onClick={() => {
                  setAvatarMenuAnchor(null);
                  setDrawerOpen(false);
                }}
                sx={{ py: 1.25 }}
              >
                Settings
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                setAvatarMenuAnchor(null);
                onSignOut();
              }}
              sx={{ py: 1.25, color: 'error.main' }}
            >
              Sign out
            </MenuItem>
          </Menu>
        </>
      )}
    </Stack>
  );
};
