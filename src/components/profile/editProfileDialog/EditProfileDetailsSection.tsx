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
  useTheme,
} from '@mui/material';
import {
  BORDER_COLOR,
  GRADIENT_END,
  INPUT_BG,
  INPUT_PADDING,
  getInputStyles,
  PURPLE_ACCENT,
} from './constants';
import {
  EDIT_PROFILE_FIELD_GROUP_SPACING,
  EDIT_PROFILE_LABEL_TO_INPUT_MB,
  FORM_SECTION_HEADING_SX,
} from '../../../lib/ui/formSurface';
import type { EditProfileFormData } from './types';

type Props = {
  busy: boolean;
  checkingHandle: boolean;
  canSave: boolean;
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
      mb: EDIT_PROFILE_LABEL_TO_INPUT_MB,
    }}
  >
    {children}
  </Typography>
);

export const EditProfileDetailsSection = ({
  busy,
  checkingHandle,
  canSave,
  onClose,
  onSave,
  bioInputRef,
  formData,
  onChange,
  onVisibilityChange,
}: Props) => {
  const theme = useTheme();
  const inputStyles = getInputStyles(theme);
  const isLight = theme.palette.mode === 'light';
  return (
    <>
      <Stack
        spacing={EDIT_PROFILE_FIELD_GROUP_SPACING}
        useFlexGap
        sx={{ width: '100%' }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{ ...FORM_SECTION_HEADING_SX, display: 'block' }}
          >
            Directory And Profile Details
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
            sx={inputStyles}
          />
        </Box>

        <Box>
          <FieldHeading>WHO SEES ME IN DIRECTORY</FieldHeading>
          <FormControl
            fullWidth
            variant="filled"
            disabled={busy}
            sx={inputStyles}
          >
            <Select
              value={formData.profile_visibility}
              onChange={(event) =>
                onVisibilityChange(
                  event.target.value as 'members_only' | 'connections_only',
                )
              }
              sx={{
                '& .MuiSelect-select': { padding: INPUT_PADDING },
                '& .MuiSelect-icon': {
                  color: isLight
                    ? theme.palette.text.secondary
                    : 'rgba(255,255,255,0.6)',
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: isLight
                      ? theme.palette.background.paper
                      : INPUT_BG,
                    color: theme.palette.text.primary,
                    border: `1px solid ${isLight ? theme.palette.divider : BORDER_COLOR}`,
                  },
                },
              }}
            >
              <MenuItem value="members_only">All signed-in members</MenuItem>
              <MenuItem value="connections_only">Only my connections</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box>
          <FieldHeading>SKILLS</FieldHeading>
          <TextField
            fullWidth
            placeholder="Skills (comma-separated)"
            value={formData.skills}
            onChange={(e) => onChange('skills', e.target.value)}
            disabled={busy}
            variant="filled"
            sx={inputStyles}
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
              ...inputStyles,
              '& .MuiFilledInput-root': {
                minHeight: 'auto',
                alignItems: 'flex-start',
                paddingTop: '8px',
              },
              '& .MuiFilledInput-input': { padding: INPUT_PADDING },
            }}
          />
        </Box>
      </Stack>

      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          zIndex: 2,
          mt: EDIT_PROFILE_FIELD_GROUP_SPACING,
          mx: -3,
          px: 3,
          pt: 2,
          pb: 1,
          background: isLight
            ? `linear-gradient(180deg, transparent 0%, ${theme.palette.background.paper} 35%, ${theme.palette.background.paper} 100%)`
            : 'linear-gradient(180deg, rgba(20,20,24,0) 0%, rgba(20,20,24,0.96) 18%, rgba(20,20,24,0.99) 100%)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Divider
          sx={{
            mb: 2,
            borderColor: isLight ? 'divider' : 'rgba(156,187,217,0.18)',
          }}
        />
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            onClick={onClose}
            disabled={busy}
            sx={{
              color: isLight ? 'text.secondary' : 'rgba(255,255,255,0.7)',
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
};
