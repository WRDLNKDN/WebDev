import {
  Alert,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useAppToast } from '../../context/AppToastContext';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  buildMarketingEmailConsentUpdate,
  buildMarketingPushConsentUpdate,
  resolveMarketingEmailEnabled,
} from '../../lib/settings/privacyConsent';
import { toMessage } from '../../lib/utils/errors';

export const SettingsPrivacyPage = () => {
  const { showToast } = useAppToast();
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingPush, setMarketingPush] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) {
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select(
        'marketing_email_enabled, marketing_opt_in, marketing_push_enabled',
      )
      .eq('id', session.session.user.id)
      .maybeSingle();
    if (loadError) {
      setError(toMessage(loadError));
    } else if (data) {
      setMarketingEmail(resolveMarketingEmailEnabled(data));
      setMarketingPush(Boolean(data.marketing_push_enabled));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarketingEmailChange = useCallback(
    async (checked: boolean) => {
      setError(null);
      setSaving(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        setError('You need to sign in to update preferences.');
        setSaving(false);
        return;
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update(buildMarketingEmailConsentUpdate(checked))
        .eq('id', session.session.user.id);
      setSaving(false);
      if (updateError) {
        setError(toMessage(updateError));
        return;
      }
      setMarketingEmail(checked);
      showToast({
        message: checked
          ? 'Marketing emails enabled.'
          : 'Marketing emails disabled.',
        severity: 'success',
      });
    },
    [showToast],
  );

  const handleMarketingPushChange = useCallback(
    async (checked: boolean) => {
      setError(null);
      setSaving(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        setError('You need to sign in to update preferences.');
        setSaving(false);
        return;
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update(buildMarketingPushConsentUpdate(checked))
        .eq('id', session.session.user.id);
      setSaving(false);
      if (updateError) {
        setError(toMessage(updateError));
        return;
      }
      setMarketingPush(checked);
      showToast({
        message: checked
          ? 'Marketing push notifications enabled.'
          : 'Marketing push notifications disabled.',
        severity: 'success',
      });
    },
    [showToast],
  );

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading…
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Marketing Communications
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Marketing includes promotional and product update messages. Account and
        security communications (password reset, security alerts, account
        verification, and non-marketing account activity) are not affected by
        these settings.
      </Typography>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {saving ? <LinearProgress aria-label="Saving privacy settings" /> : null}

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 2.5 },
          borderColor: 'rgba(255,255,255,0.08)',
          bgcolor: 'rgba(255,255,255,0.02)',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={marketingEmail}
              disabled={saving}
              onChange={(_, checked) =>
                void handleMarketingEmailChange(checked)
              }
              color="primary"
              inputProps={{ 'aria-label': 'Toggle marketing emails' }}
            />
          }
          label="Marketing Emails"
        />
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ mt: 0.5, ml: 7 }}
        >
          Promotional and product marketing emails. Off by default.
        </Typography>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 2.5 },
          borderColor: 'rgba(255,255,255,0.08)',
          bgcolor: 'rgba(255,255,255,0.02)',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={marketingPush}
              disabled={saving}
              onChange={(_, checked) => void handleMarketingPushChange(checked)}
              color="primary"
              inputProps={{
                'aria-label': 'Toggle marketing push notifications',
              }}
            />
          }
          label="Marketing Push Notifications"
        />
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ mt: 0.5, ml: 7 }}
        >
          Promotional push notifications. Off by default.
        </Typography>
      </Paper>
    </Stack>
  );
};
