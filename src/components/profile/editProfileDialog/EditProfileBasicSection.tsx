import { Edit as EditIcon } from '@mui/icons-material';
import {
  Avatar,
  Box,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { FORM_SECTION_HEADING_SX } from '../../../lib/ui/formSurface';
import { AVATAR_GRADIENT, INPUT_BG, getInputStyles } from './constants';
import type { EditProfileFormData } from './types';

type Props = {
  busy: boolean;
  formData: EditProfileFormData;
  previewURL: string;
  checkingHandle: boolean;
  handleAvailable: boolean | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  currentAvatar: string | null;
  onHandleChange: (value: string) => void;
  onPronounsChange: (value: string) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const EditProfileBasicSection = ({
  busy,
  formData,
  previewURL,
  checkingHandle,
  handleAvailable,
  fileInputRef,
  currentAvatar,
  onHandleChange,
  onPronounsChange,
  onFileChange,
}: Props) => {
  const theme = useTheme();
  const inputStyles = getInputStyles(theme);
  return (
    <>
      <Box>
        <Typography
          variant="caption"
          sx={{ ...FORM_SECTION_HEADING_SX, display: 'block', mb: 0.75 }}
        >
          Identity
        </Typography>
      </Box>

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
          <Tooltip title="Change avatar">
            <span>
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                aria-label="Edit avatar"
                sx={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  width: 24,
                  height: 24,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' },
                }}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </span>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
        </Box>
      </Box>

      <Box>
        <Typography
          variant="caption"
          sx={{
            ...FORM_SECTION_HEADING_SX,
            display: 'block',
            mb: 0.5,
          }}
        >
          User Name
        </Typography>
        <TextField
          fullWidth
          value={formData.handle}
          disabled={busy || checkingHandle}
          variant="filled"
          placeholder="anickclark"
          sx={inputStyles}
          helperText={
            formData.handle && previewURL
              ? previewURL
              : 'Your unique profile URL'
          }
          error={handleAvailable === false}
          onChange={(event) => onHandleChange(event.target.value)}
        />
      </Box>

      <Box>
        <Typography
          variant="caption"
          sx={{ ...FORM_SECTION_HEADING_SX, display: 'block', mb: 0.5 }}
        >
          Pronouns
        </Typography>
        <FormControl
          fullWidth
          variant="filled"
          disabled={busy}
          sx={inputStyles}
        >
          <Select
            value={formData.pronouns || ''}
            onChange={(event) => onPronounsChange(event.target.value)}
            displayEmpty
            renderValue={(value) => value || 'Select pronouns'}
            inputProps={{ 'aria-label': 'Pronouns' }}
            sx={{
              '& .MuiSelect-icon': {
                color:
                  theme.palette.mode === 'light'
                    ? theme.palette.text.secondary
                    : 'rgba(255,255,255,0.6)',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor:
                    theme.palette.mode === 'light'
                      ? theme.palette.background.paper
                      : INPUT_BG,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
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
    </>
  );
};
