import {
  Alert,
  Button,
  FormControlLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
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

type BlockedUser = {
  blocked_user_id: string;
  display_name: string | null;
  handle: string | null;
};

export const SettingsPrivacyPage = () => {
  const { showToast } = useAppToast();
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingPush, setMarketingPush] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) {
      setLoading(false);
      return;
    }
    const userId = session.session.user.id;
    const [profileRes, blocksRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'marketing_email_enabled, marketing_opt_in, marketing_push_enabled',
        )
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('chat_blocks')
        .select('blocked_user_id')
        .eq('blocker_id', userId),
    ]);
    if (profileRes.error) {
      setError(toMessage(profileRes.error));
    } else if (profileRes.data) {
      setMarketingEmail(resolveMarketingEmailEnabled(profileRes.data));
      setMarketingPush(Boolean(profileRes.data.marketing_push_enabled));
    }
    if (blocksRes.data && blocksRes.data.length > 0) {
      const blockedIds = blocksRes.data.map((r) => r.blocked_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle')
        .in('id', blockedIds);
      const byId = new Map(
        (profiles ?? []).map((p) => [
          p.id,
          {
            blocked_user_id: p.id,
            display_name: p.display_name ?? null,
            handle: p.handle ?? null,
          },
        ]),
      );
      setBlockedUsers(
        blockedIds.map(
          (id) =>
            byId.get(id) ?? {
              blocked_user_id: id,
              display_name: null,
              handle: null,
            },
        ),
      );
    } else {
      setBlockedUsers([]);
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

  const handleUnblock = useCallback(
    async (blockedUserId: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) return;
      setUnblockingId(blockedUserId);
      setError(null);
      const { error: deleteError } = await supabase
        .from('chat_blocks')
        .delete()
        .eq('blocker_id', session.session.user.id)
        .eq('blocked_user_id', blockedUserId);
      setUnblockingId(null);
      if (deleteError) {
        setError(toMessage(deleteError));
        return;
      }
      setBlockedUsers((prev) =>
        prev.filter((u) => u.blocked_user_id !== blockedUserId),
      );
      showToast({ message: 'Member unblocked.', severity: 'success' });
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
        Blocked members
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Members you have blocked cannot message you or see you in connection
        lists. You can unblock them below. Blocking is available from Directory
        (Manage → Block).
      </Typography>
      {blockedUsers.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          You have not blocked anyone.
        </Typography>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            borderColor: 'rgba(255,255,255,0.08)',
            bgcolor: 'rgba(255,255,255,0.02)',
          }}
        >
          <List dense disablePadding>
            {blockedUsers.map((u) => (
              <ListItem
                key={u.blocked_user_id}
                secondaryAction={
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => void handleUnblock(u.blocked_user_id)}
                    disabled={unblockingId === u.blocked_user_id}
                    aria-label={`Unblock ${u.display_name || u.handle || 'member'}`}
                  >
                    {unblockingId === u.blocked_user_id
                      ? 'Unblocking…'
                      : 'Unblock'}
                  </Button>
                }
              >
                <ListItemText
                  primary={
                    u.display_name?.trim() ||
                    (u.handle ? `@${u.handle}` : 'Unknown member')
                  }
                  secondary={u.handle && u.display_name ? `@${u.handle}` : null}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

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
