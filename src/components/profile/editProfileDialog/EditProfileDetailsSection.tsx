import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  BORDER_COLOR,
  GRADIENT_END,
  INPUT_BG,
  INPUT_PADDING,
  INPUT_STYLES,
  PURPLE_ACCENT,
} from './constants';
import { FORM_SECTION_HEADING_SX } from '../../../lib/ui/formSurface';
import type { EditProfileFormData } from './types';

type Props = {
  busy: boolean;
  checkingHandle: boolean;
  canSave: boolean;
  onManageLinks?: () => void;
  onClose: () => void;
  onSave: () => void;
  bioInputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  formData: EditProfileFormData;
  onChange: (field: keyof EditProfileFormData, value: string) => void;
  onVisibilityChange: (value: 'members_only' | 'connections_only') => void;
};

const FieldHeading = ({ children }: { children: string }) => (
  <Typography
    variant="caption"
    sx={{
      ...FORM_SECTION_HEADING_SX,
      display: 'block',
      mb: 0.5,
    }}
  >
    {children}
  </Typography>
);

export const EditProfileDetailsSection = ({
  busy,
  checkingHandle,
  canSave,
  onManageLinks,
  onClose,
  onSave,
  bioInputRef,
  formData,
  onChange,
  onVisibilityChange,
}: Props) => (
  <>
    <Box>
      <Typography
        variant="caption"
        sx={{ ...FORM_SECTION_HEADING_SX, display: 'block', mb: 0.75 }}
      >
        Directory And Profile Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
        Keep your discovery settings, skills, and bio aligned across profile and
        directory surfaces.
      </Typography>
    </Box>

    <Box>
      <FieldHeading>LOCATION</FieldHeading>
      <TextField
        fullWidth
        placeholder="City, State"
        value={formData.location}
        onChange={(e) => onChange('location', e.target.value)}
        disabled={busy}
        variant="filled"
        sx={INPUT_STYLES}
        helperText="Shown in Directory. E.g. San Francisco, CA."
      />
    </Box>

    <Box>
      <FieldHeading>WHO SEES ME IN DIRECTORY</FieldHeading>
      <FormControl fullWidth variant="filled" disabled={busy} sx={INPUT_STYLES}>
        <Select
          value={formData.profile_visibility}
          onChange={(event) =>
            onVisibilityChange(
              event.target.value as 'members_only' | 'connections_only',
            )
          }
          sx={{
            '& .MuiSelect-select': { padding: INPUT_PADDING },
            '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.6)' },
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
          <MenuItem value="members_only">All signed-in members</MenuItem>
          <MenuItem value="connections_only">Only my connections</MenuItem>
        </Select>
      </FormControl>
      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 0.5, color: 'rgba(255,255,255,0.5)' }}
      >
        Controls who can find you in the Directory.
      </Typography>
    </Box>

    {onManageLinks ? (
      <Box>
        <FieldHeading>DIRECTORY LINKS</FieldHeading>
        <Typography
          variant="caption"
          sx={{ display: 'block', mb: 1, color: 'rgba(255,255,255,0.6)' }}
        >
          Add links shown on your profile and in Directory views.
        </Typography>
        <Button
          variant="outlined"
          onClick={onManageLinks}
          disabled={busy}
          sx={{
            textTransform: 'none',
            borderColor: 'rgba(141,188,229,0.38)',
            color: 'white',
            '&:hover': {
              borderColor: PURPLE_ACCENT,
              bgcolor: 'rgba(56,132,210,0.10)',
            },
          }}
        >
          Add or Edit Links
        </Button>
      </Box>
    ) : null}

    <Box>
      <FieldHeading>SKILLS</FieldHeading>
      <TextField
        fullWidth
        placeholder="Skills (comma-separated)"
        value={formData.skills}
        onChange={(e) => onChange('skills', e.target.value)}
        disabled={busy}
        variant="filled"
        sx={INPUT_STYLES}
        helperText="List skills or tags for your profile."
      />
    </Box>

    <Box>
      <FieldHeading>BIO</FieldHeading>
      <TextField
        fullWidth
        multiline
        minRows={3}
        maxRows={6}
        placeholder="Bio"
        value={formData.bio}
        onChange={(e) => onChange('bio', e.target.value)}
        disabled={busy}
        variant="filled"
        inputRef={bioInputRef}
        sx={{
          ...INPUT_STYLES,
          '& .MuiFilledInput-root': {
            minHeight: 'auto',
            alignItems: 'flex-start',
            paddingTop: '8px',
          },
          '& .MuiFilledInput-input': { padding: INPUT_PADDING },
        }}
      />
    </Box>

    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        mt: 1,
        mx: -3,
        px: 3,
        pt: 2,
        pb: 1,
        background:
          'linear-gradient(180deg, rgba(20,20,24,0) 0%, rgba(20,20,24,0.96) 18%, rgba(20,20,24,0.99) 100%)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Divider sx={{ mb: 2, borderColor: 'rgba(156,187,217,0.18)' }} />
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          onClick={onClose}
          disabled={busy}
          sx={{
            color: 'rgba(255,255,255,0.7)',
            textTransform: 'none',
            fontSize: '0.95rem',
            '&:hover': { bgcolor: 'rgba(56,132,210,0.12)' },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={!canSave}
          startIcon={busy ? <CircularProgress size={16} /> : null}
          sx={{
            background: `linear-gradient(90deg, ${PURPLE_ACCENT} 0%, ${GRADIENT_END} 100%)`,
            color: 'white',
            textTransform: 'none',
            fontSize: '0.95rem',
            px: 3,
            '&:hover': {
              background: `linear-gradient(90deg, ${PURPLE_ACCENT} 0%, ${GRADIENT_END} 100%)`,
              filter: 'brightness(1.05)',
            },
          }}
        >
          {checkingHandle ? 'Checking...' : 'Save Changes'}
        </Button>
      </Stack>
    </Box>
  </>
);
