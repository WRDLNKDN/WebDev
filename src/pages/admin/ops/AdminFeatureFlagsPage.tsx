import {
  Box,
  LinearProgress,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useAppToast } from '../../../context/AppToastContext';
import { useFeatureFlags } from '../../../context/FeatureFlagsContext';
import { describeFlag, FLAG_LABELS, humanizeFlagKey } from './featureFlagUtils';

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
    keys: ['chat', 'groups', 'settings_privacy_marketing_consent'],
  },
  {
    id: 'growth',
    title: 'Growth',
    description: 'Monetization and expansion surfaces.',
    keys: ['store'],
  },
  {
    id: 'games',
    title: 'Games',
    description:
      'Games surface: nav link and routes (Daily Word, Chess, Scrabble, etc.).',
    keys: ['games'],
  },
];

export const AdminFeatureFlagsPage = () => {
  const { flags, loading, setFlag, refetch } = useFeatureFlags();
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const { showToast } = useAppToast();

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const handleToggle = useCallback(
    async (key: string, enabled: boolean) => {
      setBusyKeys((prev) => new Set(prev).add(key));
      try {
        await setFlag(key, enabled);
        const label = FLAG_LABELS[key] ?? humanizeFlagKey(key);
        showToast({
          message: `${label} turned ${enabled ? 'on' : 'off'}.`,
          severity: 'success',
        });
      } catch (error) {
        console.error('[FeatureFlags] toggle failed:', error);
        const label = FLAG_LABELS[key] ?? humanizeFlagKey(key);
        showToast({
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
    [setFlag, showToast],
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
                bgcolor: 'rgba(56,132,210,0.12)',
                border: '1px solid rgba(156,187,217,0.18)',
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
                      bgcolor: 'rgba(56,132,210,0.08)',
                      border: '1px solid rgba(56,132,210,0.16)',
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
    </Stack>
  );
};

export default AdminFeatureFlagsPage;
