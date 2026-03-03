import {
  Box,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';

export const SettingsPrivacyPage = () => {
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingPush, setMarketingPush] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('marketing_opt_in, marketing_push_enabled')
      .eq('id', session.session.user.id)
      .maybeSingle();
    if (data) {
      setMarketingEmail(Boolean(data.marketing_opt_in));
      setMarketingPush(Boolean(data.marketing_push_enabled));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarketingEmailChange = useCallback(async (checked: boolean) => {
    setSaving(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        marketing_opt_in: checked,
        marketing_opt_in_timestamp: checked ? new Date().toISOString() : null,
        consent_updated_at: new Date().toISOString(),
      })
      .eq('id', session.session.user.id);
    setSaving(false);
    if (!error) setMarketingEmail(checked);
  }, []);

  const handleMarketingPushChange = useCallback(async (checked: boolean) => {
    setSaving(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        marketing_push_enabled: checked,
        consent_updated_at: new Date().toISOString(),
      })
      .eq('id', session.session.user.id);
    setSaving(false);
    if (!error) setMarketingPush(checked);
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
        Marketing Communications
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Control promotional and product marketing. Account and security
        communications (e.g. password reset, verification) are unaffected.
      </Typography>

      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={marketingEmail}
              disabled={saving}
              onChange={(_, checked) =>
                void handleMarketingEmailChange(checked)
              }
              color="primary"
              inputProps={{ 'aria-label': 'Marketing emails' }}
            />
          }
          label="Marketing emails"
        />
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ mt: 0.5, ml: 7 }}
        >
          Promotional and product marketing emails. Off by default.
        </Typography>
      </Box>

      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={marketingPush}
              disabled={saving}
              onChange={(_, checked) => void handleMarketingPushChange(checked)}
              color="primary"
              inputProps={{ 'aria-label': 'Marketing push notifications' }}
            />
          }
          label="Marketing push notifications"
        />
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ mt: 0.5, ml: 7 }}
        >
          Promotional push notifications. Off by default.
        </Typography>
      </Box>
    </Stack>
  );
};
