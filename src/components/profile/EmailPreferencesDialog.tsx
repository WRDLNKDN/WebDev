import CloseIcon from '@mui/icons-material/Close';
import EmailIcon from '@mui/icons-material/Email';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const GLASS_MODAL = {
  bgcolor: '#141414',
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0))',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: 3,
};

type MarketingPrefs = {
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
  const [prefs, setPrefs] = useState<MarketingPrefs>({
    marketing_opt_in: false,
    marketing_product_updates: false,
    marketing_events: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPrefs = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('marketing_opt_in, marketing_product_updates, marketing_events')
      .eq('id', session.session.user.id)
      .maybeSingle();
    setPrefs({
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
      if (!session?.session?.user?.id) return;
      setSaving(true);
      try {
        const next = { ...prefs, [key]: value };
        setPrefs(next);
        await supabase
          .from('profiles')
          .update({
            marketing_opt_in: next.marketing_opt_in,
            marketing_product_updates: next.marketing_product_updates,
            marketing_events: next.marketing_events,
            ...(key === 'marketing_opt_in' &&
              value && {
                marketing_opt_in_timestamp: new Date().toISOString(),
                marketing_source: 'settings',
              }),
          })
          .eq('id', session.session.user.id);
      } finally {
        setSaving(false);
      }
    },
    [prefs],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-label="Email preferences"
      PaperProps={{ sx: GLASS_MODAL }}
    >
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          zIndex: 1,
          color: 'white',
        }}
      >
        <CloseIcon />
      </IconButton>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmailIcon fontSize="small" />
        Email preferences
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={prefs.marketing_opt_in}
                  onChange={(e) =>
                    handleChange('marketing_opt_in', e.target.checked)
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
    </Dialog>
  );
};
