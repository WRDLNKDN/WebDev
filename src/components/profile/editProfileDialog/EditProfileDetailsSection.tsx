import {
  Box,
  Button,
  CircularProgress,
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
    variant="overline"
    sx={{
      letterSpacing: 2,
      fontWeight: 'bold',
      color: PURPLE_ACCENT,
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
      <FieldHeading>NICHE OR FIELD</FieldHeading>
      <TextField
        fullWidth
        placeholder="Example: DevSecOps in FinTech"
        value={formData.niche_field}
        onChange={(e) => onChange('niche_field', e.target.value)}
        disabled={busy}
        variant="filled"
        sx={INPUT_STYLES}
        helperText="Used for search. Not used for filters."
      />
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
          onClick={() => {
            onClose();
            onManageLinks();
          }}
          disabled={busy}
          sx={{
            textTransform: 'none',
            borderColor: BORDER_COLOR,
            color: 'white',
            '&:hover': { borderColor: PURPLE_ACCENT },
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

    <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 2 }}>
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
        onClick={onSave}
        disabled={!canSave}
        startIcon={busy ? <CircularProgress size={16} /> : null}
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
  </>
);
