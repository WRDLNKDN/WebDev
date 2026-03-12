import PaletteIcon from '@mui/icons-material/Palette';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import {
  Box,
  Chip,
  Container,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  Link as RouterLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useFeatureFlag } from '../../context/FeatureFlagsContext';
import { supabase } from '../../lib/auth/supabaseClient';
import { SETTINGS_PRIVACY_MARKETING_CONSENT_FLAG } from '../../lib/featureFlags/keys';
import { GLASS_CARD } from '../../theme/candyStyles';

const NAV_ITEMS = [
  {
    label: 'Appearance',
    to: '/dashboard/settings/appearance',
    icon: <PaletteIcon />,
  },
  {
    label: 'Notifications',
    to: '/dashboard/settings/notifications',
    icon: <NotificationsIcon />,
  },
  {
    label: 'Privacy',
    to: '/dashboard/settings/privacy',
    icon: <PrivacyTipIcon />,
  },
];

export const SettingsLayout = () => {
  const [session, setSession] = useState<Session | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const privacyEnabled = useFeatureFlag(
    SETTINGS_PRIVACY_MARKETING_CONSENT_FLAG,
  );

  const navItems = privacyEnabled
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.to !== '/dashboard/settings/privacy');

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/');
        return;
      }
      setSession(data.session);
    };
    void init();
  }, [navigate]);

  useEffect(() => {
    if (
      !privacyEnabled &&
      location.pathname.startsWith('/dashboard/settings/privacy')
    ) {
      navigate('/dashboard/settings/notifications', { replace: true });
    }
  }, [location.pathname, navigate, privacyEnabled]);

  if (!session) return null;

  return (
    <Box
      sx={{
        flex: 1,
        pt: { xs: 2, md: 4 },
        pb: { xs: 'calc(32px + env(safe-area-inset-bottom))', md: 8 },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage your account preferences.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            mb: 3,
          }}
        >
          <Chip
            label="Esc closes dialogs"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.08)' }}
          />
          <Chip
            label="Changes save in place"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.08)' }}
          />
          <Chip
            label="Mobile-safe layout"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.08)' }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            alignItems: 'flex-start',
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              ...GLASS_CARD,
              width: { xs: '100%', md: 220 },
              flexShrink: 0,
              p: 1,
              position: { md: 'sticky' },
              top: { md: 96 },
            }}
          >
            <List disablePadding>
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <ListItemButton
                    key={item.to}
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
                );
              })}
            </List>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              ...GLASS_CARD,
              flex: 1,
              minWidth: 0,
              p: { xs: 2, md: 3 },
            }}
          >
            <Outlet />
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};
