import {
  AddPhotoAlternate as AddPhotoIcon,
  InfoOutlined as InfoOutlinedIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  DialogContent,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { RefObject } from 'react';
import {
  PORTFOLIO_CATEGORY_OPTIONS,
  normalizeProjectCategories,
} from '../../../lib/portfolio/categoryUtils';
import type { NewProject } from '../../../types/portfolio';

const SOLO_GRADIENT =
  'linear-gradient(90deg, #00C4CC 0%, #7D2AE8 50%, #FF22C9 100%)';
const LABEL_SX = {
  fontFamily: '"Poppins", sans-serif',
  letterSpacing: 0.25,
  fontSize: '0.78rem',
};
const LABEL_ROW_SX = {
  ...LABEL_SX,
  color: 'text.secondary',
  textTransform: 'uppercase',
  lineHeight: 1.2,
};
const PROJECT_IMAGE_RATIO = '16 / 9';

type FieldLabelProps = {
  text: string;
  tooltip: string;
  required?: boolean;
};

const FieldLabel = ({ text, tooltip, required = false }: FieldLabelProps) => (
  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
    <Typography component="span" sx={LABEL_ROW_SX}>
      {text}
      {required ? (
        <Box
          component="span"
          sx={{ color: 'error.main', fontWeight: 700, ml: 0.35 }}
        >
          *
        </Box>
      ) : null}
    </Typography>
    <Tooltip title={tooltip}>
      <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
    </Tooltip>
  </Stack>
);

type AddProjectDialogSectionsProps = {
  formData: NewProject;
  setFormData: React.Dispatch<React.SetStateAction<NewProject>>;
  handleChange: (
    field: keyof NewProject,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  previewUrl: string | null;
  previewLoadFailed: boolean;
  setPreviewLoadFailed: (value: boolean) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  urlTouched: boolean;
  setUrlTouched: (value: boolean) => void;
  urlErrorMessage: string;
  submitError: string | null;
  blockers: string[];
  busy: boolean;
  isEdit: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export const AddProjectDialogSections = ({
  formData,
  setFormData,
  handleChange,
  fileInputRef,
  previewUrl,
  previewLoadFailed,
  setPreviewLoadFailed,
  handleFileSelect,
  urlTouched,
  setUrlTouched,
  urlErrorMessage,
  submitError,
  blockers,
  busy,
  isEdit,
  onClose,
  onSubmit,
}: AddProjectDialogSectionsProps) => (
  <DialogContent sx={{ p: { xs: 2.5, md: 3 } }}>
    <Grid
      container
      spacing={{ xs: 2.5, md: 3.5 }}
      sx={{ mt: { xs: 1, md: 1.5 } }}
    >
      <Grid size={{ xs: 12, md: 5 }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', md: 360 },
            aspectRatio: PROJECT_IMAGE_RATIO,
            border: '2px dashed rgba(141,188,229,0.38)',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            cursor: 'pointer',
            bgcolor: 'rgba(0,0,0,0.2)',
            overflow: 'hidden',
            position: 'relative',
            '&:hover': { borderColor: '#00C4CC' },
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl && !previewLoadFailed ? (
            <Box
              component="img"
              src={previewUrl}
              alt="Project preview"
              onError={() => setPreviewLoadFailed(true)}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <AddPhotoIcon
                sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Upload image
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Drag or click
              </Typography>
            </>
          )}
          <input
            type="file"
            hidden
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileSelect}
          />
        </Box>
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ mt: 1, color: 'text.secondary' }}
        >
          <Typography variant="caption">Best ratio: 16:9</Typography>
          <Tooltip title="Best size: 1600 x 900 pixels (or any 16:9 image).">
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
          </Tooltip>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Stack spacing={{ xs: 2.5, md: 2.25 }}>
          <Box>
            <FieldLabel
              text="Project Name"
              required
              tooltip="Internal title shown on your profile card."
            />
            <TextField
              fullWidth
              required
              value={formData.title}
              onChange={handleChange('title')}
              placeholder="Enter project name"
              variant="outlined"
              size="small"
              inputProps={{
                'aria-label': 'Project Name',
                title: 'Internal title shown on your profile card.',
                'data-field-tooltip':
                  'Internal title shown on your profile card.',
              }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 1 },
                '& .MuiInputBase-input': { py: 1.35 },
              }}
            />
          </Box>

          <Box>
            <FieldLabel
              text="Categories"
              required
              tooltip="Choose one or more categories to organize this artifact."
            />
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={normalizeProjectCategories([
                ...PORTFOLIO_CATEGORY_OPTIONS,
                ...(formData.tech_stack ?? []),
              ])}
              value={normalizeProjectCategories(formData.tech_stack)}
              onChange={(_, next) =>
                setFormData((prev) => ({
                  ...prev,
                  tech_stack: normalizeProjectCategories(next),
                }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  required
                  label="Categories"
                  placeholder={
                    (formData.tech_stack?.length ?? 0) > 0
                      ? ''
                      : 'Select one or more categories'
                  }
                  helperText="Used to organize Portfolio Showcase sections."
                  variant="outlined"
                  size="small"
                  slotProps={{
                    htmlInput: {
                      ...params.inputProps,
                      'data-field-tooltip':
                        'Choose one or more categories to organize this artifact.',
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: 1 },
                    '& .MuiInputBase-input': { py: 1.35 },
                    '& .MuiFormHelperText-root': { mx: 0 },
                  }}
                />
              )}
            />
          </Box>

          <Box>
            <FieldLabel
              text="Project URL"
              required
              tooltip="Public link to your artifact. Must start with http:// or https://."
            />
            <TextField
              fullWidth
              required
              placeholder="https://example.com/file.pdf or Google Docs/Sheets/Slides link"
              value={formData.project_url}
              onChange={(e) => {
                if (!urlTouched) setUrlTouched(true);
                handleChange('project_url')(e);
              }}
              onBlur={() => setUrlTouched(true)}
              variant="outlined"
              size="small"
              inputProps={{
                'aria-label': 'Project URL',
                title:
                  'Public link to your artifact. Must start with http:// or https://.',
                'data-field-tooltip':
                  'Public link to your artifact. Must start with http:// or https://.',
              }}
              error={Boolean(urlErrorMessage)}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 1 },
                '& .MuiInputBase-input': { py: 1.35 },
                '& .MuiFormHelperText-root': { mx: 0 },
              }}
              helperText={
                urlErrorMessage ||
                'Use any public URL (https:// or http://). We verify accessibility when saving.'
              }
            />
          </Box>

          <Box>
            <FieldLabel
              text="Description"
              required
              tooltip="Short summary shown in the project card and preview."
            />
            <TextField
              fullWidth
              required
              multiline
              rows={2}
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="Describe the project outcome, your role, and impact."
              variant="outlined"
              size="small"
              inputProps={{
                'aria-label': 'Description',
                'data-field-tooltip':
                  'Short summary shown in the project card and preview.',
              }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 1 },
                '& .MuiInputBase-inputMultiline': { py: 1.25 },
              }}
            />
          </Box>
        </Stack>
      </Grid>
    </Grid>

    <Box
      sx={{
        mt: { xs: 2, md: 2.5 },
        p: { xs: 1.5, md: 1.75 },
        border: '1px solid rgba(255,255,255,0.22)',
        borderRadius: 1,
        bgcolor: 'rgba(56,132,210,0.06)',
      }}
    >
      <Stack spacing={0.5}>
        <FieldLabel
          text="Highlight in Portfolio Showcase"
          tooltip="Promotes this artifact into the highlighted carousel section."
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_highlighted}
              onChange={(_, checked) =>
                setFormData((prev) => ({ ...prev, is_highlighted: checked }))
              }
              inputProps={{ 'aria-label': 'Highlight in Portfolio Showcase' }}
              color="secondary"
            />
          }
          sx={{ m: 0 }}
          label=""
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ pl: 0.5, display: 'block' }}
        >
          Highlighted artifacts appear in the carousel above category sections
          on your profile.
        </Typography>
      </Stack>
    </Box>

    {submitError && (
      <Alert severity="error" sx={{ mt: 2 }}>
        {submitError}
      </Alert>
    )}
    {!submitError && blockers.length > 0 && (
      <Alert severity="info" sx={{ mt: 2 }}>
        To continue, {blockers.join(', ')}.
      </Alert>
    )}

    <Stack
      direction="row"
      justifyContent="space-between"
      spacing={2}
      sx={{ mt: 2.5, pt: 1.75, borderTop: '1px solid rgba(156,187,217,0.30)' }}
    >
      <Button
        onClick={onClose}
        disabled={busy}
        sx={{ color: 'white', borderColor: 'rgba(141,188,229,0.50)' }}
        variant="outlined"
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={busy || blockers.length > 0}
        startIcon={<SaveIcon />}
        sx={{ bgcolor: '#7D2AE8', '&:hover': { bgcolor: '#FF22C9' } }}
      >
        {isEdit ? 'Save changes' : 'Add to Portfolio'}
      </Button>
    </Stack>
  </DialogContent>
);

export const SOLO_GRADIENT_STYLE = SOLO_GRADIENT;
export const GLASS_MODAL_STYLE = {
  bgcolor: '#141414',
  backgroundImage:
    'linear-gradient(rgba(56,132,210,0.12), rgba(255,255,255,0))',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(156,187,217,0.22)',
  color: 'white',
  borderRadius: 1.5,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: SOLO_GRADIENT,
    zIndex: 1,
  },
};
