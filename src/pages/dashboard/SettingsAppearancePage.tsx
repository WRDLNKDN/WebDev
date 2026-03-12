import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  Chip,
  Alert,
  Box,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useAppToast } from '../../context/AppToastContext';
import { useAppTheme } from '../../context/AppThemeContext';
import type { AppThemeId } from '../../theme/themeConstants';

export const SettingsAppearancePage = () => {
  const { showToast } = useAppToast();
  const {
    themeId,
    setThemePreference,
    themeOptions,
    isSaving,
    error,
    clearError,
  } = useAppTheme();

  const handleThemeChange = async (nextThemeId: AppThemeId) => {
    if (nextThemeId === themeId) return;
    try {
      await setThemePreference(nextThemeId);
      showToast({
        message: `${themeOptions[nextThemeId].label} theme applied.`,
        severity: 'success',
      });
    } catch {
      // Error state is already handled by the theme context.
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Appearance
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Pick the overall site mood. Themes apply across desktop and mobile and
        persist to your profile.
      </Typography>
      {error ? (
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      ) : null}
      {isSaving ? (
        <LinearProgress aria-label="Saving appearance settings" />
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        {Object.values(themeOptions).map((option) => {
          const active = option.id === themeId;
          return (
            <Paper
              key={option.id}
              component="button"
              type="button"
              onClick={() => void handleThemeChange(option.id)}
              aria-pressed={active}
              sx={{
                minHeight: 220,
                p: 0,
                textAlign: 'left',
                borderRadius: 3,
                border: active
                  ? '2px solid'
                  : '1px solid rgba(255,255,255,0.08)',
                borderColor: active ? 'primary.main' : 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
                bgcolor: 'background.paper',
                color: 'text.primary',
                cursor: 'pointer',
                transition:
                  'transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 18px 32px rgba(0,0,0,0.18)',
                },
                '&:focus-visible': {
                  outline: '3px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                  '&:hover': {
                    transform: 'none',
                  },
                },
              }}
            >
              <Box
                sx={{
                  minHeight: 128,
                  background: option.gradient,
                  position: 'relative',
                  p: 2,
                }}
              >
                <Stack direction="row" spacing={1}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: option.palette.background.paper,
                      border: '1px solid rgba(255,255,255,0.14)',
                    }}
                  />
                  <Stack sx={{ flex: 1 }} spacing={1}>
                    <Box
                      sx={{
                        width: '70%',
                        height: 12,
                        borderRadius: 999,
                        bgcolor: option.palette.text.primary,
                        opacity: 0.85,
                      }}
                    />
                    <Box
                      sx={{
                        width: '48%',
                        height: 10,
                        borderRadius: 999,
                        bgcolor: option.palette.text.secondary,
                        opacity: 0.65,
                      }}
                    />
                  </Stack>
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ position: 'absolute', left: 16, bottom: 16 }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 28,
                      borderRadius: 999,
                      bgcolor: option.palette.primary.main,
                    }}
                  />
                  <Box
                    sx={{
                      width: 40,
                      height: 28,
                      borderRadius: 999,
                      bgcolor: option.palette.secondary.main,
                    }}
                  />
                </Stack>
              </Box>
              <Stack spacing={1} sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {option.label}
                  </Typography>
                  {active ? (
                    <CheckCircleIcon fontSize="small" color="primary" />
                  ) : null}
                </Stack>
                <Box sx={{ minHeight: 32 }}>
                  {active ? (
                    <Chip
                      size="small"
                      color="primary"
                      icon={<CheckCircleIcon />}
                      label="Current theme"
                      aria-label={`${option.label} is the current theme`}
                      sx={{ fontWeight: 700 }}
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Select theme
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {option.description}
                </Typography>
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Stack>
  );
};
