import CloseIcon from '@mui/icons-material/Close';
import EmailIcon from '@mui/icons-material/Email';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { useAppToast } from '../../../context/AppToastContext';
import { shouldCloseDialogFromReason } from '../../../lib/ui/dialogFormUtils';
import { dialogPaperSxFromTheme } from '../../../lib/ui/formSurface';
import {
  dialogActionsSafeAreaSx,
  mergeFullScreenDialogPaperSx,
} from '../../../lib/ui/fullScreenDialogSx';
import { supabase } from '../../../lib/auth/supabaseClient';
import { toMessage } from '../../../lib/utils/errors';

type MarketingPrefs = {
  marketing_email_enabled: boolean;
  marketing_opt_in: boolean;
  marketing_product_updates: boolean;
  marketing_events: boolean;
};

export type EmailPreferencesDialogProps = {
  open: boolean;
  onClose: () => void;
};

export const EmailPreferencesDialog = ({
  open,
  onClose,
}: EmailPreferencesDialogProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [prefs, setPrefs] = useState<MarketingPrefs>({
    marketing_email_enabled: false,
    marketing_opt_in: false,
    marketing_product_updates: false,
    marketing_events: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useAppToast();

  const loadPrefs = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select(
        'marketing_email_enabled, marketing_opt_in, marketing_product_updates, marketing_events',
      )
      .eq('id', session.session.user.id)
      .maybeSingle();
    setPrefs({
      marketing_email_enabled: Boolean(
        (data as MarketingPrefs | null)?.marketing_email_enabled ??
        (data as MarketingPrefs | null)?.marketing_opt_in,
      ),
      marketing_opt_in: Boolean(
        (data as MarketingPrefs | null)?.marketing_opt_in,
      ),
      marketing_product_updates: Boolean(
        (data as MarketingPrefs | null)?.marketing_product_updates,
      ),
      marketing_events: Boolean(
        (data as MarketingPrefs | null)?.marketing_events,
      ),
    });
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      void loadPrefs().finally(() => setLoading(false));
    }
  }, [open, loadPrefs]);

  const handleChange = useCallback(
    async (key: keyof MarketingPrefs, value: boolean) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        showToast({
          message: 'Sign in again to update email preferences.',
          severity: 'warning',
        });
        return;
      }
      setSaving(true);
      const previous = prefs;
      try {
        const next = { ...prefs, [key]: value };
        if (key === 'marketing_email_enabled') {
          next.marketing_opt_in = value;
        }
        setPrefs(next);
        const { error } = await supabase
          .from('profiles')
          .update({
            marketing_email_enabled: next.marketing_email_enabled,
            marketing_opt_in: next.marketing_opt_in,
            marketing_product_updates: next.marketing_product_updates,
            marketing_events: next.marketing_events,
            consent_updated_at: new Date().toISOString(),
            ...((key === 'marketing_email_enabled' ||
              key === 'marketing_opt_in') &&
              value && {
                marketing_opt_in_timestamp: new Date().toISOString(),
                marketing_source: 'settings',
              }),
          })
          .eq('id', session.session.user.id);
        if (error) throw error;
        showToast({
          message: 'Email preferences updated.',
          severity: 'success',
        });
      } catch (error) {
        setPrefs(previous);
        showToast({
          message: toMessage(error),
          severity: 'error',
        });
      } finally {
        setSaving(false);
      }
    },
    [prefs, showToast],
  );

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (shouldCloseDialogFromReason(reason)) onClose();
      }}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      aria-label="Email preferences"
      PaperProps={{
        sx: mergeFullScreenDialogPaperSx(
          fullScreen,
          dialogPaperSxFromTheme(theme, { borderRadius: 3 }),
        ),
      }}
    >
      <Tooltip title="Close">
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
            color: isLight ? 'text.secondary' : 'white',
          }}
        >
          <CloseIcon />
        </IconButton>
      </Tooltip>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pr: 6,
          pb: 1,
        }}
      >
        <EmailIcon fontSize="small" />
        Email preferences
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }} dividers>
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Toggle updates here and they save immediately. Press Esc to close
            when you are done.
          </Typography>
          {saving ? (
            <LinearProgress
              aria-label="Saving email preferences"
              sx={{ borderRadius: 999 }}
            />
          ) : null}
        </Stack>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={prefs.marketing_email_enabled}
                  onChange={(e) =>
                    handleChange('marketing_email_enabled', e.target.checked)
                  }
                  disabled={saving}
                  color="primary"
                />
              }
              label="Marketing and newsletters"
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: -1 }}
            >
              Occasional product updates, events, and community news.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={prefs.marketing_product_updates}
                  onChange={(e) =>
                    handleChange('marketing_product_updates', e.target.checked)
                  }
                  disabled={saving}
                  color="primary"
                />
              }
              label="Product updates"
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: -1 }}
            >
              New features and improvements.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={prefs.marketing_events}
                  onChange={(e) =>
                    handleChange('marketing_events', e.target.checked)
                  }
                  disabled={saving}
                  color="primary"
                />
              }
              label="Events"
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: -1 }}
            >
              Community events and meetups.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions
        sx={dialogActionsSafeAreaSx(fullScreen, {
          px: 3,
          pb: 2,
          pt: 1.5,
        })}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mr: 'auto' }}
        >
          Changes save automatically.
        </Typography>
      </DialogActions>
    </Dialog>
  );
};
