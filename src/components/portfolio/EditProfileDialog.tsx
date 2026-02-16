import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import {
  CameraAlt as CameraIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { toMessage } from '../../lib/errors';
import { supabase } from '../../lib/supabaseClient';
import type { DashboardProfile, NerdCreds } from '../../types/profile';

// Brand colors matching the screenshot
const GRADIENT_START = '#00C4CC'; // Blue-teal
const GRADIENT_END = '#FF22C9'; // Pink-purple
const AVATAR_GRADIENT = `linear-gradient(135deg, ${GRADIENT_START} 0%, ${GRADIENT_END} 100%)`;
const PURPLE_ACCENT = '#B366FF'; // Purple for headings
const DARK_BG = '#1a1a1f'; // Dark background
const INPUT_BG = '#28282d'; // Input background
const BORDER_COLOR = 'rgba(255,255,255,0.08)';

const GLASS_MODAL = {
  bgcolor: DARK_BG,
  backdropFilter: 'blur(20px)',
  border: `1px solid ${BORDER_COLOR}`,
  color: 'white',
  borderRadius: 3,
  position: 'relative',
  overflow: 'visible',
  boxShadow: '0 24px 48px rgba(0,0,0,0.9)',
  maxWidth: '540px',
  width: '100%',
};

const INPUT_STYLES = {
  '& .MuiFilledInput-root': {
    bgcolor: INPUT_BG,
    borderRadius: '8px',
    border: `1px solid ${BORDER_COLOR}`,
    paddingTop: '8px',
    paddingBottom: '8px',
    minHeight: '48px',
    '&:hover': {
      bgcolor: 'rgba(50, 50, 55, 0.9)',
      borderColor: 'rgba(255,255,255,0.12)',
    },
    '&.Mui-focused': {
      bgcolor: 'rgba(50, 50, 55, 0.95)',
      borderColor: PURPLE_ACCENT,
    },
    '&:before, &:after': {
      display: 'none',
    },
  },
  '& .MuiFilledInput-input': {
    padding: '12px 14px',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
  },
  '& .MuiInputBase-input': {
    color: 'white',
    fontSize: '0.95rem',
  },
  '& .MuiFormHelperText-root': {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    mt: 0.5,
  },
};

type EditProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  profile: DashboardProfile | null;
  hasWeirdling?: boolean;
  onUpdate: (
    updates: Partial<DashboardProfile> & { nerd_creds?: Partial<NerdCreds> },
  ) => Promise<void>;
  onUpload: (file: File) => Promise<string | undefined>;
};

const safeStr = (val: unknown, fallback: string = ''): string => {
  if (typeof val === 'string') return val;
  return fallback;
};

export const EditProfileDialog = ({
  open,
  onClose,
  profile,
  hasWeirdling: _hasWeirdling = false,
  onUpdate,
  onUpload,
}: EditProfileDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    handle: '',
    pronouns: '',
    status_message: '',
    bio: '',
    skills: '',
  });

  const [busy, setBusy] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (open && profile) {
      const creds = (profile.nerd_creds as Record<string, unknown>) || {};

      setFormData({
        handle: safeStr(profile.handle),
        pronouns: safeStr(profile.pronouns),
        status_message: safeStr(creds.status_message),
        bio: safeStr(creds.bio),
        skills: safeStr(
          Array.isArray(creds.skills)
            ? (creds.skills as string[]).join(', ')
            : typeof creds.skills === 'string'
              ? creds.skills
              : '',
        ),
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
    if (!profile) return;

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
    if (handleAvailable === false || checkingHandle) {
      return;
    }

    try {
      setBusy(true);
      const skillsArr = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await onUpdate({
        handle: formData.handle,
        pronouns: formData.pronouns,
        nerd_creds: {
          status_message: formData.status_message,
          bio: formData.bio,
          skills: skillsArr.length ? skillsArr : undefined,
        },
      });

      setToastMessage('Profile updated successfully!');
      setShowToast(true);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (error) {
      console.error(error);
      setToastMessage(toMessage(error));
      setShowToast(true);
    } finally {
      setBusy(false);
    }
  };

  const MAX_AVATAR_BYTES = 6 * 1024 * 1024;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setToastMessage('File too large. Max 6MB.');
      setShowToast(true);
      e.target.value = '';
      return;
    }
    try {
      setBusy(true);
      const url = await onUpload(file);
      if (url) {
        setUploadedAvatarUrl(url);
        setToastMessage('Avatar updated.');
        setShowToast(true);
      }
    } catch (error) {
      console.error(error);
      setToastMessage(toMessage(error));
      setShowToast(true);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const currentAvatar = uploadedAvatarUrl || profile?.avatar || null;
  const previewURL = `http://localhost:5173/profile/${formData.handle}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: GLASS_MODAL,
      }}
    >
      {/* Title Bar */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
          borderBottom: `1px solid ${BORDER_COLOR}`,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            background: AVATAR_GRADIENT,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          EDIT <span style={{ color: PURPLE_ACCENT }}>PROFILE</span>
        </Typography>
        <IconButton
          onClick={onClose}
          disabled={busy}
          sx={{
            color: 'rgba(255,255,255,0.6)',
            '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 3 }}>
        {busy && !uploadedAvatarUrl ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: PURPLE_ACCENT }} />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Avatar Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={currentAvatar || undefined}
                  sx={{
                    width: 80,
                    height: 80,
                    background: currentAvatar ? 'transparent' : AVATAR_GRADIENT,
                    border: `3px solid transparent`,
                    backgroundImage: AVATAR_GRADIENT,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                />
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  sx={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    bgcolor: GRADIENT_START,
                    color: 'white',
                    width: 32,
                    height: 32,
                    '&:hover': {
                      bgcolor: GRADIENT_END,
                    },
                  }}
                >
                  <CameraIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </Box>
            </Box>

            {/* Handle */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  display: 'block',
                  mb: 1,
                  fontWeight: 500,
                }}
              >
                Handle
              </Typography>
              <TextField
                fullWidth
                value={formData.handle}
                disabled={busy || checkingHandle}
                variant="filled"
                placeholder="anickclark"
                sx={INPUT_STYLES}
                helperText={
                  formData.handle && previewURL
                    ? previewURL
                    : 'Your unique profile URL'
                }
                error={handleAvailable === false}
                onChange={(e) => {
                  const val = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '');
                  setFormData((prev) => ({ ...prev, handle: val }));
                  checkHandle(val);
                }}
              />
            </Box>

            {/* Pronouns */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  display: 'block',
                  mb: 1,
                  fontWeight: 500,
                }}
              >
                Pronouns
              </Typography>
              <FormControl fullWidth variant="filled" disabled={busy}>
                <Select
                  value={formData.pronouns || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pronouns: e.target.value,
                    }))
                  }
                  displayEmpty
                  sx={{
                    ...INPUT_STYLES['& .MuiFilledInput-root'],
                    color: 'white',
                    minHeight: '48px',
                    '& .MuiSelect-select': {
                      padding: '12px 14px',
                    },
                    '& .MuiSelect-icon': {
                      color: 'rgba(255,255,255,0.6)',
                    },
                    '&:before, &:after': {
                      display: 'none',
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: INPUT_BG,
                        color: 'white',
                        border: `1px solid ${BORDER_COLOR}`,
                      },
                    },
                  }}
                >
                  <MenuItem value="">Select pronouns</MenuItem>
                  <MenuItem value="She/Her">She/Her</MenuItem>
                  <MenuItem value="He/Him">He/Him</MenuItem>
                  <MenuItem value="They/Them">They/Them</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Status */}
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 2,
                  fontWeight: 'bold',
                  color: PURPLE_ACCENT,
                  display: 'block',
                  mb: 1,
                }}
              >
                STATUS
              </Typography>
              <TextField
                fullWidth
                placeholder="Message"
                value={formData.status_message}
                onChange={handleChange('status_message')}
                disabled={busy}
                variant="filled"
                sx={INPUT_STYLES}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: 'rgba(50, 50, 55, 0.9)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1,
                        }}
                      >
                        <ChatBubbleOutlineIcon
                          sx={{ color: 'white', fontSize: 18 }}
                        />
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Skills */}
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 2,
                  fontWeight: 'bold',
                  color: PURPLE_ACCENT,
                  display: 'block',
                  mb: 1,
                }}
              >
                SKILLS
              </Typography>
              <TextField
                fullWidth
                placeholder="Skills (comma-separated)"
                value={formData.skills}
                onChange={handleChange('skills')}
                disabled={busy}
                variant="filled"
                sx={INPUT_STYLES}
                helperText="List skills or tags for your profile."
              />
            </Box>

            {/* Bio */}
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 2,
                  fontWeight: 'bold',
                  color: PURPLE_ACCENT,
                  display: 'block',
                  mb: 1,
                }}
              >
                BIO
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={5}
                placeholder="Bio"
                value={formData.bio}
                onChange={handleChange('bio')}
                disabled={busy}
                variant="filled"
                sx={{
                  ...INPUT_STYLES,
                  '& .MuiFilledInput-root': {
                    ...INPUT_STYLES['& .MuiFilledInput-root'],
                    alignItems: 'flex-start',
                    paddingTop: '12px',
                  },
                }}
              />
            </Box>

            {/* Action Buttons */}
            <Stack
              direction="row"
              spacing={2}
              justifyContent="flex-end"
              sx={{ pt: 2 }}
            >
              <Button
                onClick={onClose}
                disabled={busy}
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={busy || handleAvailable === false || checkingHandle}
                startIcon={busy ? <CircularProgress size={16} /> : <SaveIcon />}
                sx={{
                  bgcolor: PURPLE_ACCENT,
                  color: 'white',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  px: 3,
                  '&:hover': {
                    bgcolor: GRADIENT_END,
                  },
                }}
              >
                {checkingHandle ? 'Checking...' : 'Save Changes'}
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <Snackbar
        open={showToast}
        autoHideDuration={4000}
        onClose={() => setShowToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #2c1e12 0%, #1a1a1a 100%)',
            border: '1px solid #d4af37',
            color: '#f5f5f5',
            p: 2,
            borderRadius: 1,
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
          }}
        >
          {toastMessage}
        </Box>
      </Snackbar>
    </Dialog>
  );
};
