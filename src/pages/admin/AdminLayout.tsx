import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import CampaignIcon from '@mui/icons-material/Campaign';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import {
  Box,
  Button,
  Container,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

const BG_SX = {
  minHeight: '100vh',
  position: 'relative' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  backgroundColor: '#05070f',
  backgroundImage: 'url(/assets/landing-bg.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  overflow: 'hidden' as const,
  '&::before': {
    content: '""',
    position: 'absolute' as const,
    inset: 0,
    background:
      'radial-gradient(circle at 50% 30%, rgba(0,0,0,0.35), rgba(0,0,0,0.85))',
  },
};

const SIDEBAR_WIDTH = 260;

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: <DashboardIcon /> },
  {
    label: 'Profile Moderation',
    to: '/admin/moderation',
    icon: <PeopleIcon />,
  },
  {
    label: 'Chat Reports',
    to: '/admin/chat-reports',
    icon: <ReportProblemIcon />,
  },
  {
    label: 'Advertisers',
    to: '/admin/advertisers',
    icon: <CampaignIcon />,
  },
];

function getBreadcrumbs(pathname: string): { label: string; to?: string }[] {
  const parts = pathname
    .replace(/^\/admin\/?/, '')
    .split('/')
    .filter(Boolean);
  const crumbs: { label: string; to?: string }[] = [
    { label: 'Admin', to: '/admin' },
  ];
  let acc = '/admin';
  for (const p of parts) {
    acc += `/${p}`;
    const item = NAV_ITEMS.find((n) => n.to === acc);
    crumbs.push({
      label:
        item?.label ??
        p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' '),
      to: acc,
    });
  }
  return crumbs;
}

type Props = {
  children: ReactNode;
  session: Session | null;
  onSignOut: () => void;
  signOutBusy: boolean;
  title?: string;
  subtitle?: string;
};

export const AdminLayout = ({
  children,
  session,
  onSignOut,
  signOutBusy,
  title,
  subtitle,
}: Props) => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  const sidebar = (
    <Paper
      component="nav"
      variant="outlined"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        borderRadius: 2,
        borderColor: 'rgba(255,255,255,0.12)',
        bgcolor: 'rgba(16, 18, 24, 0.6)',
        p: 1,
      }}
    >
      <List disablePadding>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <ListItem key={item.to} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.to}
                selected={isActive}
                sx={{
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255,255,255,0.08)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );

  return (
    <Box sx={{ ...BG_SX, position: 'relative' }}>
      <Box sx={{ position: 'relative', flex: 1, py: 4, px: { xs: 2, md: 4 } }}>
        <Container maxWidth="xl" disableGutters>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
              alignItems: 'flex-start',
            }}
          >
            {/* Sidebar - sticky on desktop, horizontal scroll on mobile */}
            <Box
              sx={{
                position: { md: 'sticky' },
                top: 24,
                width: { xs: '100%', md: SIDEBAR_WIDTH },
                flexShrink: 0,
              }}
            >
              {sidebar}
              {session && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={signOutBusy ? null : <LogoutIcon />}
                  onClick={onSignOut}
                  disabled={signOutBusy}
                  fullWidth
                  sx={{
                    mt: 2,
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#fff',
                    justifyContent: 'flex-start',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.5)',
                      bgcolor: 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  {signOutBusy ? 'Signing out…' : 'Sign out'}
                </Button>
              )}
            </Box>

            {/* Main content */}
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              {/* Breadcrumbs */}
              <Box
                sx={{
                  mb: 2,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {breadcrumbs.map((crumb, i) => (
                  <Box key={crumb.to ?? 'current'} component="span">
                    {i > 0 && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ mx: 0.5 }}
                      >
                        /
                      </Typography>
                    )}
                    {crumb.to && i < breadcrumbs.length - 1 ? (
                      <Typography
                        component={RouterLink}
                        to={crumb.to}
                        variant="body2"
                        sx={{
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {crumb.label}
                      </Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                        }}
                      >
                        {crumb.label}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>

              {/* Optional page title */}
              {(title || subtitle) && (
                <Box sx={{ mb: 3 }}>
                  {title && (
                    <Typography
                      component="h1"
                      variant="h4"
                      sx={{ fontWeight: 800, mb: subtitle ? 0.5 : 0 }}
                    >
                      {title}
                    </Typography>
                  )}
                  {subtitle && (
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                      {subtitle}
                    </Typography>
                  )}
                </Box>
              )}

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.12)',
                  bgcolor: 'rgba(16, 18, 24, 0.70)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
                  p: { xs: 3, sm: 4 },
                  color: '#fff',
                }}
              >
                {children}
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};
