import {
  Alert,
  Box,
  LinearProgress,
  Portal,
  Snackbar,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useFeatureFlags } from '../../../context/FeatureFlagsContext';

/** Human-readable labels for feature flag keys. */
const FLAG_LABELS: Record<string, string> = {
  feed: 'Feed',
  dashboard: 'Dashboard',
  events: 'Events',
  store: 'Store',
  directory: 'Directory',
  chat: 'Chat',
  games: 'Games',
  settings_privacy_marketing_consent: 'Privacy Settings',
};

/** Hover descriptions shown for each toggle. */
const FLAG_DESCRIPTIONS: Record<string, string> = {
  feed: 'Controls access to the main Feed surface.',
  dashboard:
    'Controls access to Dashboard, notifications, and settings surfaces.',
  events: 'Controls visibility of Events pages and event discovery links.',
  store: 'Controls access to the Store section.',
  directory: 'Controls access to the member Directory.',
  chat: 'Controls chat UI, overlays, and chat entry points.',
  games: 'Controls Games navigation links and the /games route.',
  settings_privacy_marketing_consent:
    'Controls the Privacy settings page for marketing email/push consent.',
};

type FlagCategory = {
  id: string;
  title: string;
  description: string;
  keys: string[];
};

const FLAG_CATEGORIES: FlagCategory[] = [
  {
    id: 'core',
    title: 'Core',
    description: 'Primary authenticated surfaces.',
    keys: ['feed', 'dashboard'],
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Discovery surfaces currently wired to feature flags.',
    keys: ['events', 'directory'],
  },
  {
    id: 'engagement',
    title: 'Engagement',
    description: 'Communication and account-preference surfaces.',
    keys: ['chat', 'settings_privacy_marketing_consent'],
  },
  {
    id: 'growth',
    title: 'Growth',
    description: 'Monetization and expansion surfaces.',
    keys: ['store', 'games'],
  },
];

const humanizeFlagKey = (key: string): string =>
  key
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const describeFlag = (key: string): string =>
  FLAG_DESCRIPTIONS[key] ??
  `Controls the ${humanizeFlagKey(key)} feature throughout the site.`;

export const AdminFeatureFlagsPage = () => {
  const { flags, loading, setFlag, refetch } = useFeatureFlags();
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const handleToggle = useCallback(
    async (key: string, enabled: boolean) => {
      setBusyKeys((prev) => new Set(prev).add(key));
      try {
        await setFlag(key, enabled);
        const label = FLAG_LABELS[key] ?? humanizeFlagKey(key);
        setToast({
          open: true,
          message: `${label} turned ${enabled ? 'on' : 'off'}.`,
          severity: 'success',
        });
      } catch (error) {
        console.error('[FeatureFlags] toggle failed:', error);
        const label = FLAG_LABELS[key] ?? humanizeFlagKey(key);
        setToast({
          open: true,
          message: `Failed to update ${label}.`,
          severity: 'error',
        });
      } finally {
        setBusyKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [setFlag],
  );

  const categories: FlagCategory[] = FLAG_CATEGORIES;

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Feature Flags
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Turn wired surfaces on or off. Changes apply immediately for all
          visitors.
        </Typography>
      </Stack>

      {loading ? (
        <LinearProgress aria-label="Loading feature flags" />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 1.5,
            alignItems: 'start',
          }}
        >
          {categories.map((category) => (
            <Box
              key={category.id}
              sx={{
                minWidth: 0,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                p: 1.5,
              }}
            >
              <Stack spacing={0.5} sx={{ mb: 1.25 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {category.title}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.78 }}>
                  {category.description}
                </Typography>
              </Stack>

              <Box
                component="ul"
                sx={{
                  listStyle: 'none',
                  m: 0,
                  p: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {category.keys.map((key) => (
                  <Box
                    component="li"
                    key={key}
                    sx={{
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      py: 1,
                      px: 1.25,
                      width: '100%',
                      maxWidth: { xs: '100%', lg: 430 },
                      mr: 'auto',
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <Stack spacing={0} sx={{ minWidth: 0, flex: 1 }}>
                      <Tooltip
                        title={describeFlag(key)}
                        arrow
                        placement="top-start"
                        enterDelay={250}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            whiteSpace: 'normal',
                            overflowWrap: 'anywhere',
                            lineHeight: 1.3,
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            textUnderlineOffset: '3px',
                            cursor: 'help',
                            display: 'inline-block',
                            width: 'fit-content',
                            maxWidth: '100%',
                          }}
                        >
                          {FLAG_LABELS[key] ?? humanizeFlagKey(key)}
                        </Typography>
                      </Tooltip>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      sx={{ flexShrink: 0 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ minWidth: 22, textAlign: 'right', opacity: 0.85 }}
                      >
                        {flags[key] !== false ? 'On' : 'Off'}
                      </Typography>
                      <Switch
                        checked={flags[key] !== false}
                        disabled={busyKeys.has(key)}
                        onChange={(_, checked) =>
                          void handleToggle(key, checked)
                        }
                        color="primary"
                        inputProps={{
                          'aria-label': `Toggle ${FLAG_LABELS[key] ?? humanizeFlagKey(key)}`,
                        }}
                      />
                    </Stack>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      <Portal>
        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={(_, reason) => {
            if (reason === 'clickaway') return;
            setToast((prev) => ({ ...prev, open: false }));
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            left: '50% !important',
            right: 'auto !important',
            transform: 'translateX(-50%) !important',
            bottom: 'max(16px, env(safe-area-inset-bottom)) !important',
          }}
        >
          <Alert
            severity={toast.severity}
            variant="filled"
            sx={{
              width: 'max-content',
              maxWidth: 'min(92vw, 560px)',
              borderRadius: 1.5,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              '& .MuiAlert-message': {
                fontWeight: 600,
              },
            }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </Portal>
    </Stack>
  );
};

export default AdminFeatureFlagsPage;
