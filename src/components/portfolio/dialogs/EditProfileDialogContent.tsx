import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { CameraAlt as CameraIcon, Save as SaveIcon } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  DialogContent,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { RefObject } from 'react';
import {
  AVATAR_GRADIENT,
  BORDER_COLOR,
  GRADIENT_END,
  GRADIENT_START,
  INPUT_BG,
  INPUT_STYLES,
  PURPLE_ACCENT,
} from './editProfileDialogStyles';

type FormData = {
  handle: string;
  pronouns: string;
  status_message: string;
  bio: string;
  skills: string;
};

type Props = {
  busy: boolean;
  uploadedAvatarUrl: string | null;
  profileAvatar?: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  checkHandle: (val: string) => void;
  checkingHandle: boolean;
  handleAvailable: boolean | null;
  previewURL: string;
  handleChange: (
    field: string,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSave: () => void;
  onClose: () => void;
  showToast: boolean;
  toastMessage: string;
  setShowToast: (show: boolean) => void;
};

export const EditProfileDialogContent = ({
  busy,
  uploadedAvatarUrl,
  profileAvatar,
  fileInputRef,
  handleFileChange,
  formData,
  setFormData,
  checkHandle,
  checkingHandle,
  handleAvailable,
  previewURL,
  handleChange,
  handleSave,
  onClose,
  showToast,
  toastMessage,
  setShowToast,
}: Props) => {
  const currentAvatar = uploadedAvatarUrl || profileAvatar || null;
  return (
    <>
      <DialogContent sx={{ pt: 3, pb: 3 }}>
        {busy && !uploadedAvatarUrl ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: PURPLE_ACCENT }} />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={currentAvatar || undefined}
                  sx={{
                    width: 80,
                    height: 80,
                    background: currentAvatar ? 'transparent' : AVATAR_GRADIENT,
                    border: '3px solid transparent',
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
                    '&:hover': { bgcolor: GRADIENT_END },
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
                      pronouns: String(e.target.value),
                    }))
                  }
                  displayEmpty
                  sx={{
                    ...INPUT_STYLES['& .MuiFilledInput-root'],
                    color: 'white',
                    minHeight: '48px',
                    '& .MuiSelect-select': { padding: '12px 14px' },
                    '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.6)' },
                    '&:before, &:after': { display: 'none' },
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
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
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
                  '&:hover': { bgcolor: GRADIENT_END },
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
    </>
  );
};
