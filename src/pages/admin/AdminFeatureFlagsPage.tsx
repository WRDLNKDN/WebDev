import {
  Box,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';

/** Human-readable labels for feature flag keys. */
const FLAG_LABELS: Record<string, string> = {
  events: 'Events',
  store: 'Store',
  directory: 'Directory',
  groups: 'Groups',
  chat: 'Chat',
  advertise: 'Advertise',
  games: 'Games (Phuzzle link)',
  community_partners: 'Community Partners',
  saved: 'Saved',
  help: 'Help',
};

export const AdminFeatureFlagsPage = () => {
  const { flags, loading, setFlag, refetch } = useFeatureFlags();
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const handleToggle = useCallback(
    async (key: string, enabled: boolean) => {
      setBusyKeys((prev) => new Set(prev).add(key));
      try {
        await setFlag(key, enabled);
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

  const keys = Object.keys(FLAG_LABELS).length
    ? Object.keys(FLAG_LABELS)
    : Object.keys(flags);
  const sortedKeys = [...new Set([...keys, ...Object.keys(flags)])].sort();

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Feature Flags
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Turn site features on or off. Changes apply immediately for all
          visitors.
        </Typography>
      </Stack>

      {loading ? (
        <LinearProgress aria-label="Loading feature flags" />
      ) : (
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
          {sortedKeys.map((key) => (
            <Box
              component="li"
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                px: 2,
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={flags[key] !== false}
                    disabled={busyKeys.has(key)}
                    onChange={(_, checked) => void handleToggle(key, checked)}
                    color="primary"
                    inputProps={{
                      'aria-label': `Toggle ${FLAG_LABELS[key] ?? key}`,
                    }}
                  />
                }
                label={FLAG_LABELS[key] ?? key}
                labelPlacement="start"
                sx={{ mr: 0 }}
              />
              <Typography variant="caption" color="text.secondary">
                {key}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  );
};

export default AdminFeatureFlagsPage;
