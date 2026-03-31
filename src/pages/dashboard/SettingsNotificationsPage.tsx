import { Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useAppToast } from '../../context/AppToastContext';
import { supabase } from '../../lib/auth/supabaseClient';
import { toMessage } from '../../lib/utils/errors';
import {
  SettingsLoadingLine,
  SettingsSavingProgress,
  SettingsSectionStack,
  SettingsSwitchCard,
} from './settings/settingsFormPrimitives';

export const SettingsNotificationsPage = () => {
  const { showToast } = useAppToast();
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

  const handlePushChange = useCallback(
    async (checked: boolean) => {
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
      showToast({
        message: checked
          ? 'Push notifications enabled.'
          : 'Push notifications disabled.',
        severity: 'success',
      });
    },
    [showToast],
  );

  const handleEmailChange = useCallback(
    async (checked: boolean) => {
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
      showToast({
        message: checked
          ? 'Email notifications enabled.'
          : 'Email notifications disabled.',
        severity: 'success',
      });
    },
    [showToast],
  );

  if (loading) {
    return <SettingsLoadingLine />;
  }

  return (
    <SettingsSectionStack>
      <Typography
        variant="h6"
        component="h1"
        sx={{ fontWeight: 700 }}
        data-testid="settings-notifications-heading"
      >
        Delivery Channels
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Choose how you receive account activity notifications. Critical emails
        (password reset, security alerts, account verification) cannot be
        disabled.
      </Typography>
      {saving ? (
        <SettingsSavingProgress label="Saving notification settings" />
      ) : null}

      <SettingsSwitchCard
        label="Push notifications"
        checked={pushEnabled}
        disabled={saving}
        onChange={(v) => void handlePushChange(v)}
        switchAriaLabel="Enable push notifications"
        caption="Receive in-browser push alerts for comments, reactions, and connection requests."
        error={pushError}
        onClearError={() => setPushError(null)}
      />

      <SettingsSwitchCard
        label="Email notifications"
        checked={emailEnabled}
        disabled={saving}
        onChange={(v) => void handleEmailChange(v)}
        switchAriaLabel="Enable email notifications"
        caption="Receive emails for comments, reactions, mentions, and connection requests. Critical account and security emails are always sent."
        error={emailError}
        onClearError={() => setEmailError(null)}
      />
    </SettingsSectionStack>
  );
};
