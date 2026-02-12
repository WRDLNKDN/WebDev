import {
  CameraAlt as CameraIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid, // CORRECT: Standard Grid import for MUI v7
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { DashboardProfile, NerdCreds } from '../../types/profile'; // Adjusted import path for subfolder

// 90s VIBE ASSETS
const SOLO_GRADIENT =
  'linear-gradient(90deg, #00C4CC 0%, #7D2AE8 50%, #FF22C9 100%)';
// NEW STYLE (Paste this)
const GLASS_MODAL = {
  bgcolor: '#141414', // Solid dark background for better contrast
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0))', // Subtle top-down shine
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: 3, // Ensure nice curves (MUI default is usually 1 or 2)
  position: 'relative',
  overflow: 'hidden', // Ensures the gradient stripe follows the curve
  boxShadow: '0 20px 40px rgba(0,0,0,0.8)', // Deeper shadow for pop

  // The "Jazz Stripe" Pseudo-element
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px', // Thickness of the stripe
    background: SOLO_GRADIENT,
    zIndex: 1,
  },
};

type EditProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  profile: DashboardProfile;
  hasWeirdling?: boolean;
  onUpdate: (
    updates: Partial<DashboardProfile> & { nerd_creds?: Partial<NerdCreds> },
  ) => Promise<void>;
  onUpload: (file: File) => Promise<string | undefined>;
};

// HELPER: The "Type Safety Valve"
// This kills "Type '{}' is not assignable to string" forever.
const safeStr = (val: unknown, fallback: string = ''): string => {
  if (typeof val === 'string') return val;
  return fallback;
};

export const EditProfileDialog = ({
  open,
  onClose,
  profile,
  hasWeirdling = false,
  onUpdate,
  onUpload,
}: EditProfileDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local State
  const [formData, setFormData] = useState({
    handle: '',
    pronouns: '',
    tagline: '',
    status_emoji: '',
    status_message: '',
    bio: '',
    use_weirdling_avatar: false,
  });

  const [busy, setBusy] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(
    null,
  );

  // Sync state when profile opens; clear local avatar when profile or dialog changes
  useEffect(() => {
    if (open && profile) {
      // We cast to any/Record to access properties, but we use safeStr to validate the output
      const creds = (profile.nerd_creds as Record<string, unknown>) || {};
      const p = profile as unknown as { use_weirdling_avatar?: boolean };

      setFormData({
        handle: safeStr(profile.handle),
        pronouns: safeStr(profile.pronouns),
        tagline: safeStr(profile.tagline),
        status_emoji: safeStr(creds.status_emoji, '💬'),
        status_message: safeStr(creds.status_message),
        bio: safeStr(creds.bio),
        use_weirdling_avatar: Boolean(p.use_weirdling_avatar),
      });
      setUploadedAvatarUrl(null);
    }
  }, [open, profile]);

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const checkHandle = async (val: string) => {
    if (val.length < 3) {
      setHandleAvailable(null);
      return;
    }

    // Don't flag as "taken" if it's the one you already have
    if (val === profile.handle) {
      setHandleAvailable(true);
      return;
    }

    setCheckingHandle(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('handle')
        .eq('handle', val)
        .maybeSingle();

      setHandleAvailable(!data);
    } finally {
      setCheckingHandle(false);
    }
  };

  const handleSave = async () => {
    // GUARD: Don't allow save if handle is taken or currently being checked
    if (handleAvailable === false || checkingHandle) {
      return;
    }

    try {
      setBusy(true);
      await onUpdate({
        handle: formData.handle,
        pronouns: formData.pronouns,
        tagline: formData.tagline,
        use_weirdling_avatar: formData.use_weirdling_avatar,
        nerd_creds: {
          status_emoji: formData.status_emoji,
          status_message: formData.status_message,
          bio: formData.bio,
        },
      });

      // TRIGGER TOAST: The "Crunch" happens here
      setToastMessage(
        'SYSTEM_PATCH_APPLIED: The Human OS is now synchronized.',
      );
      setShowToast(true);

      // DELAYED EXIT: Give them 1.2s of "Success" dopamine before closing
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Write operation failed. Check console for details.';
      setToastMessage(message);
      setShowToast(true);
    } finally {
      setBusy(false);
    }
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      setToastMessage('');
      const url = await onUpload(file);
      if (url) {
        setUploadedAvatarUrl(url);
        setToastMessage('Photo updated.');
        setShowToast(true);
      }
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Upload failed. Check that the avatars bucket exists and you have permission.';
      setToastMessage(message);
      setShowToast(true);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: GLASS_MODAL }}
    >
      <DialogTitle
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', p: 3 }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontFamily: '"Poppins", sans-serif',
              letterSpacing: 1,
            }}
          >
            EDIT{' '}
            <Box
              component="span"
              sx={{
                background: SOLO_GRADIENT,
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              SIGNAL
            </Box>
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, md: 4 } }}>
        {/* CORRECT GRID V7 SYNTAX: Use 'size' prop */}
        <Grid container spacing={4} sx={{ mt: 0 }}>
          {/* AVATAR COLUMN */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack alignItems="center" spacing={2}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={uploadedAvatarUrl || profile.avatar || undefined}
                  sx={{
                    width: 150,
                    height: 150,
                    border: '4px solid transparent',
                    background: `linear-gradient(#1a1a1a, #1a1a1a) padding-box, ${SOLO_GRADIENT} border-box`,
                  }}
                />
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: '#00C4CC',
                    color: 'black',
                    '&:hover': { bgcolor: '#FF22C9' },
                  }}
                >
                  <CameraIcon />
                </IconButton>
                <input
                  type="file"
                  hidden
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{ opacity: 0.7, fontFamily: 'monospace' }}
              >
                UPLOAD_VISUAL.exe
              </Typography>
              {hasWeirdling && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.use_weirdling_avatar}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          use_weirdling_avatar: e.target.checked,
                        }))
                      }
                      disabled={busy}
                      sx={{
                        color: 'white',
                        '&.Mui-checked': { color: 'primary.main' },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      Use my Weirdling as my profile picture
                    </Typography>
                  }
                />
              )}
            </Stack>
          </Grid>

          {/* FORM COLUMN */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="overline"
                  color="primary"
                  sx={{ letterSpacing: 2, fontWeight: 'bold' }}
                >
                  Core Identity
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Handle (Vanity URL)"
                      value={formData.handle}
                      disabled={busy}
                      variant="filled"
                      error={handleAvailable === false}
                      helperText={
                        handleAvailable === false
                          ? 'ACCESS_DENIED: Handle already in use.'
                          : checkingHandle
                            ? 'AUDITING...'
                            : 'Your public link: /profile/' +
                              (formData.handle || 'handle') // canonical route per IA
                      }
                      onChange={(e) => {
                        const val = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '');
                        setFormData((prev) => ({ ...prev, handle: val }));
                        checkHandle(val);
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Pronouns"
                      value={formData.pronouns}
                      onChange={handleChange('pronouns')}
                      disabled={busy}
                      variant="filled"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Tagline"
                      value={formData.tagline}
                      onChange={handleChange('tagline')}
                      disabled={busy}
                      variant="filled"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography
                  variant="overline"
                  color="secondary"
                  sx={{ letterSpacing: 2, fontWeight: 'bold' }}
                >
                  Status Signal
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    sx={{ width: 80 }}
                    label="Emoji"
                    value={formData.status_emoji}
                    onChange={handleChange('status_emoji')}
                    disabled={busy}
                    variant="filled"
                  />
                  <TextField
                    fullWidth
                    label="Message"
                    value={formData.status_message}
                    onChange={handleChange('status_message')}
                    disabled={busy}
                    variant="filled"
                  />
                </Stack>
              </Box>

              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: 2,
                    fontWeight: 'bold',
                    color: '#00C4CC',
                  }}
                >
                  System Logs
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Bio"
                  value={formData.bio}
                  onChange={handleChange('bio')}
                  disabled={busy}
                  variant="filled"
                />
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={2}
          sx={{ mt: 4 }}
        >
          <Button
            onClick={onClose}
            disabled={busy}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={busy || handleAvailable === false || checkingHandle} // Added guards here
            startIcon={<SaveIcon />}
            sx={{ bgcolor: '#7D2AE8', '&:hover': { bgcolor: '#FF22C9' } }}
          >
            {checkingHandle ? 'AUDITING...' : 'Save Changes'}
          </Button>
        </Stack>
      </DialogContent>
      {/* WRAP YOUR BOX IN THIS SNACKBAR
          This is what actually 'uses' the showToast variable
      */}
      <Snackbar
        open={showToast}
        autoHideDuration={4000}
        onClose={() => setShowToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 2 }} // Lift it slightly off the bottom
      >
        <Box
          sx={{
            // A subtle "Golden Grahams / Toasted" color palette
            background: 'linear-gradient(135deg, #2c1e12 0%, #1a1a1a 100%)',
            border: '1px solid',
            borderColor: toastMessage.includes('FAILURE')
              ? '#ff22c9'
              : '#d4af37', // Gold for success
            color: '#f5f5f5',
            p: '12px 24px',
            borderRadius: '4px', // Harder edges feel more "system"
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
            fontFamily: '"Share Tech Mono", monospace',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            '&::after': {
              content: '"_"',
              animation: 'blink 1s step-end infinite',
            },
            '@keyframes blink': {
              '50%': { opacity: 0 },
            },
          }}
        >
          {toastMessage}
        </Box>
      </Snackbar>
    </Dialog>
  );
};
