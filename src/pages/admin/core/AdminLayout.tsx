import CampaignIcon from '@mui/icons-material/Campaign';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FlagIcon from '@mui/icons-material/Flag';
import HandshakeIcon from '@mui/icons-material/Handshake';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import {
  Box,
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
import { PAGE_BACKGROUND } from '../../../theme/candyStyles';

const BG_SX = {
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  overflowX: 'hidden' as const,
  ...PAGE_BACKGROUND,
  position: 'relative' as const,
  backgroundAttachment: { xs: 'scroll', md: 'fixed' },
};

const SIDEBAR_WIDTH = 260;
const ADMIN_TEXT_PRIMARY = '#FFFFFF';
const ADMIN_TEXT_SECONDARY = 'rgba(255,255,255,0.88)';
const ADMIN_TEXT_MUTED = 'rgba(255,255,255,0.72)';

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: <DashboardIcon /> },
  {
    label: 'Content Moderation',
    to: '/admin/content',
    icon: <VideoLibraryIcon />,
  },
  {
    label: 'Chat Reports',
    to: '/admin/chat-reports',
    icon: <ReportProblemIcon />,
  },
  {
    label: 'Auth Callback Health',
    to: '/admin/auth-callback-health',
    icon: <MonitorHeartIcon />,
  },
  {
    label: 'Advertisers',
    to: '/admin/advertisers',
    icon: <CampaignIcon />,
  },
  {
    label: 'Community Partners',
    to: '/admin/community-partners',
    icon: <HandshakeIcon />,
  },
  {
    label: 'Feature Flags',
    to: '/admin/feature-flags',
    icon: <FlagIcon />,
  },
];

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export const AdminLayout = ({ children, title, subtitle }: Props) => {
  const location = useLocation();

  const sidebar = (
    <Paper
      component="nav"
      variant="outlined"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        borderRadius: 2,
        borderColor: 'rgba(156,187,217,0.26)',
        bgcolor: 'rgba(17,24,39,0.78)',
        p: 1,
        color: ADMIN_TEXT_PRIMARY,
        '& .MuiListItemText-primary': {
          color: ADMIN_TEXT_PRIMARY,
        },
        '& .MuiListItemIcon-root': {
          color: ADMIN_TEXT_SECONDARY,
        },
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
                  color: ADMIN_TEXT_SECONDARY,
                  '&:hover': {
                    color: ADMIN_TEXT_PRIMARY,
                    bgcolor: 'rgba(56,132,210,0.14)',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(56,132,210,0.18)',
                    color: ADMIN_TEXT_PRIMARY,
                    '&:hover': { bgcolor: 'rgba(56,132,210,0.24)' },
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
            </Box>

            {/* Main content */}
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
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
                  border: '1px solid rgba(156,187,217,0.26)',
                  bgcolor: 'rgba(17,24,39,0.84)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
                  p: { xs: 3, sm: 4 },
                  color: ADMIN_TEXT_PRIMARY,
                  '& .MuiTypography-root': {
                    color: 'inherit',
                  },
                  '& .MuiTypography-body2, & .MuiTypography-caption, & .MuiTypography-overline':
                    {
                      color: ADMIN_TEXT_SECONDARY,
                    },
                  '& .MuiTableCell-root': {
                    color: ADMIN_TEXT_PRIMARY,
                    borderColor: 'rgba(156,187,217,0.22)',
                  },
                  '& .MuiTableCell-head': {
                    color: ADMIN_TEXT_PRIMARY,
                    fontWeight: 700,
                  },
                  '& .MuiDivider-root': {
                    borderColor: 'rgba(156,187,217,0.26)',
                  },
                  '& .MuiChip-root': {
                    color: ADMIN_TEXT_PRIMARY,
                  },
                  '& .MuiAlert-message': {
                    color: ADMIN_TEXT_PRIMARY,
                  },
                  '& .MuiFormLabel-root': {
                    color: ADMIN_TEXT_SECONDARY,
                    '& .MuiFormLabel-asterisk': {
                      color: '#f44336',
                    },
                  },
                  '& .MuiFormLabel-root.Mui-focused': {
                    color: ADMIN_TEXT_PRIMARY,
                  },
                  '& .MuiFormLabel-root.Mui-focused .MuiFormLabel-asterisk': {
                    color: '#f44336',
                  },
                  '& .MuiInputBase-root': {
                    color: ADMIN_TEXT_PRIMARY,
                    backgroundColor: 'rgba(56,132,210,0.10)',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: ADMIN_TEXT_MUTED,
                    opacity: 1,
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(141,188,229,0.34)',
                  },
                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline':
                    {
                      borderColor: 'rgba(141,188,229,0.50)',
                    },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
                    {
                      borderColor: '#3884D2',
                    },
                  '& .MuiSelect-icon': {
                    color: ADMIN_TEXT_SECONDARY,
                  },
                  '& .MuiFormHelperText-root': {
                    color: ADMIN_TEXT_MUTED,
                  },
                  '& .MuiButton-text': {
                    color: ADMIN_TEXT_PRIMARY,
                  },
                  '& a': {
                    color: '#8DBCE5',
                  },
                  '& .MuiCard-root, & .MuiPaper-root': {
                    color: ADMIN_TEXT_PRIMARY,
                  },
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
