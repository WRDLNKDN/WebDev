import {
  Alert,
  Box,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
import { toMessage } from '../../lib/utils/errors';

export const SettingsNotificationsPage = () => {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('push_enabled, email_notifications_enabled')
      .eq('id', session.session.user.id)
      .maybeSingle();
    if (error) {
      setPushError(toMessage(error));
    } else if (data) {
      setPushEnabled(Boolean(data.push_enabled));
      setEmailEnabled(Boolean(data.email_notifications_enabled));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePushChange = useCallback(async (checked: boolean) => {
    setPushError(null);
    setEmailError(null);
    if (checked) {
      if (!('Notification' in window)) {
        setPushError('Push notifications are not supported in this browser.');
        return;
      }
      if (Notification.permission === 'denied') {
        setPushError(
          'Push notifications were previously denied. Enable them in your browser settings.',
        );
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushError(
          'Permission denied. Enable notifications in your browser to receive push alerts.',
        );
        return;
      }
    }
    setSaving(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) {
      setPushError('You need to sign in to update preferences.');
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ push_enabled: checked })
      .eq('id', session.session.user.id);
    setSaving(false);
    if (error) {
      setPushError(toMessage(error));
      return;
    }
    setPushEnabled(checked);
  }, []);

  const handleEmailChange = useCallback(async (checked: boolean) => {
    setEmailError(null);
    setPushError(null);
    setSaving(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) {
      setEmailError('You need to sign in to update preferences.');
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ email_notifications_enabled: checked })
      .eq('id', session.session.user.id);
    setSaving(false);
    if (error) {
      setEmailError(toMessage(error));
      return;
    }
    setEmailEnabled(checked);
  }, []);

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
        Delivery Channels
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Choose how you receive account activity notifications. Critical emails
        (password reset, security alerts, account verification) cannot be
        disabled.
      </Typography>

      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={pushEnabled}
              disabled={saving}
              onChange={(_, checked) => void handlePushChange(checked)}
              color="primary"
              inputProps={{ 'aria-label': 'Enable push notifications' }}
            />
          }
          label="Push notifications"
        />
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ mt: 0.5, ml: 7 }}
        >
          Receive in-browser push alerts for comments, reactions, and connection
          requests.
        </Typography>
        {pushError && (
          <Alert
            severity="info"
            sx={{ mt: 1 }}
            onClose={() => setPushError(null)}
          >
            {pushError}
          </Alert>
        )}
      </Box>

      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={emailEnabled}
              disabled={saving}
              onChange={(_, checked) => void handleEmailChange(checked)}
              color="primary"
              inputProps={{ 'aria-label': 'Enable email notifications' }}
            />
          }
          label="Email notifications"
        />
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ mt: 0.5, ml: 7 }}
        >
          Receive emails for comments, reactions, mentions, and connection
          requests. Critical account and security emails are always sent.
        </Typography>
        {emailError && (
          <Alert
            severity="info"
            sx={{ mt: 1 }}
            onClose={() => setEmailError(null)}
          >
            {emailError}
          </Alert>
        )}
      </Box>
    </Stack>
  );
};
