import {
  Alert,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';

export const SETTINGS_OUTLINED_PAPER_SX = {
  p: { xs: 2, md: 2.5 },
  borderColor: 'rgba(255,255,255,0.08)',
  bgcolor: 'rgba(255,255,255,0.02)',
} as const;

/** Outlined list container (no inner padding; list provides density). */
export const SETTINGS_LIST_PAPER_SX = {
  borderColor: 'rgba(255,255,255,0.08)',
  bgcolor: 'rgba(255,255,255,0.02)',
} as const;

export const SettingsLoadingLine = () => (
  <Typography variant="body2" color="text.secondary">
    Loading…
  </Typography>
);

export const SettingsSavingProgress = ({ label }: { label: string }) => (
  <LinearProgress aria-label={label} />
);

type SettingsSwitchCardProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  switchAriaLabel: string;
  caption: ReactNode;
  error?: string | null;
  onClearError?: () => void;
};

export const SettingsSwitchCard = ({
  label,
  checked,
  disabled,
  onChange,
  switchAriaLabel,
  caption,
  error,
  onClearError,
}: SettingsSwitchCardProps) => (
  <Paper variant="outlined" sx={SETTINGS_OUTLINED_PAPER_SX}>
    <FormControlLabel
      control={
        <Switch
          checked={checked}
          disabled={disabled}
          onChange={(_, v) => onChange(v)}
          color="primary"
          inputProps={{ 'aria-label': switchAriaLabel }}
        />
      }
      label={label}
    />
    <Typography
      variant="caption"
      display="block"
      color="text.secondary"
      sx={{ mt: 0.5, ml: 7 }}
    >
      {caption}
    </Typography>
    {error ? (
      <Alert severity="error" sx={{ mt: 1 }} onClose={onClearError}>
        {error}
      </Alert>
    ) : null}
  </Paper>
);

type SettingsSectionStackProps = {
  children: ReactNode;
};

export const SettingsSectionStack = ({
  children,
}: SettingsSectionStackProps) => <Stack spacing={3}>{children}</Stack>;
