import {
  AddPhotoAlternate as AddPhotoIcon,
  Close as CloseIcon,
  InfoOutlined as InfoOutlinedIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import {
  PORTFOLIO_CATEGORY_OPTIONS,
  normalizeProjectCategories,
} from '../../lib/portfolio/categoryUtils';
import {
  getPortfolioUrlSafetyError,
  validatePortfolioUrl,
} from '../../lib/portfolio/linkValidation';
import { toMessage } from '../../lib/utils/errors';
import type { NewProject, PortfolioItem } from '../../types/portfolio';

// REUSING THE VIBE
const SOLO_GRADIENT =
  'linear-gradient(90deg, #00C4CC 0%, #7D2AE8 50%, #FF22C9 100%)';
const TERMINAL_LABEL_SX = {
  fontFamily: '"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace',
  letterSpacing: 0.25,
  fontSize: '0.78rem',
};
const LABEL_ROW_SX = {
  ...TERMINAL_LABEL_SX,
  color: 'text.secondary',
  textTransform: 'uppercase',
  lineHeight: 1.2,
};
const GLASS_MODAL = {
  bgcolor: '#141414',
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0))',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
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
const PROJECT_IMAGE_RATIO = '16 / 9';

type AddProjectDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    project: NewProject,
    file?: File,
    projectId?: string,
  ) => Promise<void>;
  /** When set, dialog is in edit mode (prefill form, title "Edit Project") */
  initialProject?: PortfolioItem | null;
  projectId?: string;
};

const emptyForm: NewProject = {
  title: '',
  description: '',
  image_url: '',
  project_url: '',
  tech_stack: [],
  is_highlighted: false,
};

export const AddProjectDialog = ({
  open,
  onClose,
  onSubmit,
  initialProject,
  projectId,
}: AddProjectDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<NewProject>(emptyForm);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [urlTouched, setUrlTouched] = useState(false);

  const isEdit = Boolean(initialProject && projectId);

  const FieldLabel = ({
    text,
    tooltip,
    required = false,
  }: {
    text: string;
    tooltip: string;
    required?: boolean;
  }) => (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
      <Typography sx={LABEL_ROW_SX}>
        {text}
        {required ? ' *' : ''}
      </Typography>
      <Tooltip title={tooltip}>
        <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
      </Tooltip>
    </Stack>
  );

  useEffect(() => {
    if (open) setSubmitError(null);
  }, [open]);

  useEffect(() => {
    if (open && isEdit && initialProject) {
      setFormData({
        title: initialProject.title,
        description: initialProject.description ?? '',
        image_url: initialProject.image_url ?? '',
        project_url: initialProject.project_url ?? '',
        tech_stack: normalizeProjectCategories(initialProject.tech_stack ?? []),
        is_highlighted: Boolean(initialProject.is_highlighted),
      });
      setPreviewUrl(
        typeof initialProject.image_url === 'string' &&
          initialProject.image_url.trim().length > 0
          ? initialProject.image_url
          : null,
      );
      setPreviewLoadFailed(false);
      setSelectedFile(undefined);
    } else if (open) {
      setFormData(emptyForm);
      setPreviewUrl(null);
      setPreviewLoadFailed(false);
      setSelectedFile(undefined);
    }
    if (open) setUrlTouched(false);
  }, [open, initialProject, isEdit]);

  const handleChange =
    (field: keyof NewProject) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSubmitError(
          'Please choose an image file (PNG, JPG, WEBP, GIF, etc.).',
        );
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewLoadFailed(false);
    }
  };

  const isExternalUrl = (url: string) => /^https?:\/\//i.test(url.trim());
  const normalizedCategories = normalizeProjectCategories(formData.tech_stack);
  const url = formData.project_url.trim();
  const hasTitle = Boolean(formData.title.trim());
  const hasDescription = Boolean(formData.description.trim());
  const hasCategories = normalizedCategories.length > 0;
  const hasUrl = Boolean(url);
  const hasValidProtocol = !hasUrl || isExternalUrl(url);
  const urlSafetyError =
    hasUrl && hasValidProtocol ? getPortfolioUrlSafetyError(url) : '';
  const urlErrorMessage =
    !hasUrl || (!urlTouched && !submitError)
      ? ''
      : !hasValidProtocol
        ? 'Use a full URL starting with https:// or http://.'
        : urlSafetyError
          ? urlSafetyError
          : '';
  const blockers: string[] = [];
  if (!hasTitle) blockers.push('add a project name');
  if (!hasDescription) blockers.push('add a description');
  if (!hasCategories) blockers.push('select at least one category');
  if (!hasUrl) blockers.push('add a project URL');
  if (hasUrl && !hasValidProtocol) blockers.push('fix URL format (http/https)');
  if (urlSafetyError) blockers.push('use a professional project URL');
  const isSubmitDisabled = busy || blockers.length > 0;

  const handleSubmit = async () => {
    setSubmitError(null);
    const url = formData.project_url?.trim() ?? '';
    const validation = await validatePortfolioUrl(url, {
      checkAccessible: true,
    });
    if (!validation.ok) {
      setSubmitError(validation.error);
      return;
    }
    const selectedCategories = normalizeProjectCategories(formData.tech_stack);
    if (selectedCategories.length === 0) {
      setSubmitError('Select at least one category.');
      return;
    }
    try {
      setBusy(true);
      await onSubmit(
        { ...formData, tech_stack: selectedCategories },
        selectedFile,
        projectId,
      );
      if (!isEdit) {
        setFormData(emptyForm);
        setPreviewUrl(null);
        setSelectedFile(undefined);
      }
      onClose();
    } catch (error) {
      console.error(error);
      setSubmitError(toMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          ...GLASS_MODAL,
          width: { md: 'min(980px, 96vw)' },
        },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          p: { xs: 2, md: 2.5 },
        }}
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
              letterSpacing: 0.8,
              fontFamily:
                '"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace',
            }}
          >
            {isEdit ? 'EDIT ' : 'NEW '}
            <Box
              component="span"
              sx={{
                background: SOLO_GRADIENT,
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              PROJECT
            </Box>
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Grid
          container
          spacing={{ xs: 2.5, md: 3.5 }}
          sx={{ mt: { xs: 1, md: 1.5 } }}
        >
          {/* IMAGE UPLOAD COLUMN */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', md: 360 },
                aspectRatio: PROJECT_IMAGE_RATIO,
                border: '2px dashed rgba(255,255,255,0.2)',
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

          {/* FORM COLUMN */}
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
                  onChange={(_, next) => {
                    setFormData((prev) => ({
                      ...prev,
                      tech_stack: normalizeProjectCategories(next),
                    }));
                  }}
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
            bgcolor: 'rgba(255,255,255,0.02)',
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
                  onChange={(_, checked) => {
                    setFormData((prev) => ({
                      ...prev,
                      is_highlighted: checked,
                    }));
                  }}
                  inputProps={{
                    'aria-label': 'Highlight in Portfolio Showcase',
                  }}
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
              Highlighted artifacts appear in the carousel above category
              sections on your profile.
            </Typography>
          </Stack>
        </Box>

        {submitError && (
          <Alert
            severity="error"
            onClose={() => setSubmitError(null)}
            sx={{ mt: 2 }}
          >
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
          sx={{
            mt: 2.5,
            pt: 1.75,
            borderTop: '1px solid rgba(255,255,255,0.15)',
          }}
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
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            startIcon={<SaveIcon />}
            sx={{ bgcolor: '#7D2AE8', '&:hover': { bgcolor: '#FF22C9' } }}
          >
            {isEdit ? 'Save changes' : 'Add to Portfolio'}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
