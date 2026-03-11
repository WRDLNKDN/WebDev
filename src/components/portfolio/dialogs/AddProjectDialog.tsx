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
  Chip,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getProjectCategorySelection,
  isPredefinedProjectCategory,
  MAX_CUSTOM_PROJECT_CATEGORY_LENGTH,
  normalizeCustomProjectCategory,
  PORTFOLIO_CATEGORY_OPTIONS,
  PORTFOLIO_OTHER_CATEGORY_OPTION,
  normalizeProjectCategories,
} from '../../../lib/portfolio/categoryUtils';
import {
  getPortfolioUrlSafetyError,
  PORTFOLIO_NOT_PUBLIC_ERROR,
  sanitizePortfolioUrlInput,
  validatePortfolioUrl,
} from '../../../lib/portfolio/linkValidation';
import {
  FORM_ACCENT_GRADIENT,
  FORM_DIALOG_SX,
  FORM_SECTION_HEADING_SX,
  FORM_SECTION_PANEL_SX,
} from '../../../lib/ui/formSurface';
import { containsProfanity } from '../../../lib/utils/profanityFilter';
import { normalizeUrlForDedup } from '../../../lib/utils/linkPlatform';
import { toMessage } from '../../../lib/utils/errors';
import type { NewProject, PortfolioItem } from '../../../types/portfolio';

const LABEL_SX = {
  fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
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
  /** Existing projects used to block duplicate project URLs (optional). */
  existingProjects?: PortfolioItem[];
  /** Profile link URLs to treat as duplicates (project URL must not match any). */
  existingLinkUrls?: (string | null)[];
};

const emptyForm: NewProject = {
  title: '',
  description: '',
  image_url: '',
  project_url: 'https://',
  tech_stack: [],
  is_highlighted: false,
};

export const AddProjectDialog = ({
  open,
  onClose,
  onSubmit,
  initialProject,
  projectId,
  existingProjects = [],
  existingLinkUrls = [],
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
  const [selectedCategory, setSelectedCategory] = useState<
    | (typeof PORTFOLIO_CATEGORY_OPTIONS)[number]
    | typeof PORTFOLIO_OTHER_CATEGORY_OPTION
    | null
  >(null);
  const [customCategory, setCustomCategory] = useState('');

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

  useEffect(() => {
    if (open) setSubmitError(null);
  }, [open]);

  useEffect(() => {
    if (open && isEdit && initialProject) {
      const categorySelection = getProjectCategorySelection(
        initialProject.tech_stack ?? [],
      );
      setFormData({
        title: initialProject.title,
        description: initialProject.description ?? '',
        image_url: initialProject.image_url ?? '',
        project_url: initialProject.project_url ?? '',
        tech_stack: normalizeProjectCategories(
          initialProject.tech_stack ?? [],
          1,
        ),
        is_highlighted: Boolean(initialProject.is_highlighted),
      });
      setSelectedCategory(categorySelection.pickerValue);
      setCustomCategory(categorySelection.customCategory);
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
      setSelectedCategory(null);
      setCustomCategory('');
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

  const isExternalUrl = (url: string) =>
    /^https?:\/\//i.test(sanitizePortfolioUrlInput(url));
  const normalizedCustomCategory =
    normalizeCustomProjectCategory(customCategory);
  const customCategoryHasProfanity = containsProfanity(
    normalizedCustomCategory,
  );
  const selectedCategoryValue =
    selectedCategory === PORTFOLIO_OTHER_CATEGORY_OPTION
      ? normalizedCustomCategory
      : selectedCategory;
  const normalizedCategories = selectedCategoryValue
    ? normalizeProjectCategories([selectedCategoryValue], 1)
    : [];
  const url = sanitizePortfolioUrlInput(formData.project_url);
  const hasTitle = Boolean(formData.title.trim());
  const hasCategories = normalizedCategories.length > 0;
  const hasUrl = Boolean(url);
  const hasValidProtocol = !hasUrl || isExternalUrl(url);
  const customCategoryError =
    selectedCategory !== PORTFOLIO_OTHER_CATEGORY_OPTION
      ? ''
      : !normalizedCustomCategory
        ? 'Enter a custom category.'
        : normalizedCustomCategory.length > MAX_CUSTOM_PROJECT_CATEGORY_LENGTH
          ? `Custom categories must be ${MAX_CUSTOM_PROJECT_CATEGORY_LENGTH} characters or fewer.`
          : customCategoryHasProfanity
            ? 'Custom categories cannot contain profanity.'
            : '';
  const urlSafetyError =
    hasUrl && hasValidProtocol ? getPortfolioUrlSafetyError(url) : '';
  const normalizedFormUrl = hasUrl ? normalizeUrlForDedup(url) : '';
  const normalizedLinkUrls = useMemo(
    () =>
      new Set(
        existingLinkUrls
          .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
          .map((u) => normalizeUrlForDedup(u)),
      ),
    [existingLinkUrls],
  );
  const isDuplicateProjectUrl = Boolean(
    normalizedFormUrl &&
      existingProjects.some(
        (p) =>
          p.id !== projectId &&
          normalizeUrlForDedup(p.project_url?.trim() ?? '') ===
            normalizedFormUrl,
      ),
  );
  const isDuplicateLinkUrl = Boolean(
    normalizedFormUrl && normalizedLinkUrls.has(normalizedFormUrl),
  );
  const urlErrorMessage =
    !hasUrl || (!urlTouched && !submitError)
      ? ''
      : isDuplicateLinkUrl
        ? 'This URL is already in your links. Use a different URL or add it as a link instead.'
        : isDuplicateProjectUrl
          ? 'This URL is already used by another project.'
          : !hasValidProtocol
            ? 'Use a full URL starting with https:// or http://.'
            : urlSafetyError
              ? urlSafetyError
              : '';
  const blockers: string[] = [];
  if (!hasTitle) blockers.push('add a project name');
  if (!hasCategories) blockers.push('select at least one category');
  if (customCategoryError) blockers.push('fix the custom category');
  if (!hasUrl) blockers.push('add a project URL');
  if (hasUrl && !hasValidProtocol) blockers.push('fix URL format (http/https)');
  if (urlSafetyError) blockers.push('use a professional project URL');
  if (isDuplicateProjectUrl || isDuplicateLinkUrl)
    blockers.push('use a different project URL');
  const isSubmitDisabled = busy || blockers.length > 0;
  const readinessItems = [
    { label: 'Project name', ready: hasTitle },
    { label: 'Category', ready: hasCategories && !customCategoryError },
    {
      label: 'Project URL',
      ready: hasUrl && hasValidProtocol && !urlErrorMessage,
    },
    { label: 'Description', ready: true, optional: true },
  ];

  const handleSubmit = async () => {
    setSubmitError(null);
    const url = sanitizePortfolioUrlInput(formData.project_url ?? '');
    const validation = await validatePortfolioUrl(url, {
      checkAccessible: true,
    });
    if (!validation.ok) {
      if (validation.error === PORTFOLIO_NOT_PUBLIC_ERROR) {
        // Many valid destinations block HEAD/CORS checks. Treat this as advisory,
        // not a save blocker, and persist the edited URL anyway.
      } else {
        setSubmitError(validation.error);
        return;
      }
    }
    const normalizedUrl = normalizeUrlForDedup(url);
    if (normalizedUrl) {
      const duplicateProject = existingProjects.some(
        (p) =>
          p.id !== projectId &&
          normalizeUrlForDedup(p.project_url?.trim() ?? '') === normalizedUrl,
      );
      if (duplicateProject) {
        setSubmitError(
          'This project URL is already used by another project. Use a different URL.',
        );
        return;
      }
      if (normalizedLinkUrls.has(normalizedUrl)) {
        setSubmitError(
          'This URL is already in your links. Use a different URL or add it as a link instead.',
        );
        return;
      }
    }
    if (normalizedCategories.length === 0) {
      setSubmitError('Select a category.');
      return;
    }
    if (customCategoryError) {
      setSubmitError(customCategoryError);
      return;
    }
    try {
      setBusy(true);
      await onSubmit(
        {
          ...formData,
          description: formData.description.trim(),
          project_url: url,
          tech_stack: normalizedCategories,
        },
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
          ...FORM_DIALOG_SX,
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
              fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
            }}
          >
            {isEdit ? 'EDIT ' : 'NEW '}
            <Box
              component="span"
              sx={{
                background: FORM_ACCENT_GRADIENT,
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              PROJECT
            </Box>
          </Typography>
          <Tooltip title="Close">
            <IconButton
              onClick={onClose}
              sx={{ color: 'white' }}
              aria-label="Close dialog"
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={1} sx={{ mb: { xs: 2, md: 2.5 } }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 760 }}
          >
            Add a polished portfolio artifact with one canonical category so it
            groups cleanly everywhere your work appears.
          </Typography>
        </Stack>
        <Grid
          container
          spacing={{ xs: 2.5, md: 3.5 }}
          sx={{ mt: { xs: 1, md: 1.5 } }}
        >
          {/* IMAGE UPLOAD COLUMN */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={FORM_SECTION_PANEL_SX}>
              <Typography
                variant="caption"
                sx={{ ...FORM_SECTION_HEADING_SX, display: 'block', mb: 0.75 }}
              >
                Cover Media
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5, maxWidth: 320 }}
              >
                A strong thumbnail improves scanability in your profile and
                showcase surfaces.
              </Typography>
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
                  transition: 'border-color 160ms ease, transform 160ms ease',
                  '&:hover': {
                    borderColor: '#00C4CC',
                    transform: 'translateY(-1px)',
                  },
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
            </Box>
          </Grid>

          {/* FORM COLUMN */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={{ xs: 2.5, md: 2.25 }}>
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  border: '1px solid rgba(255,255,255,0.12)',
                  bgcolor: 'rgba(255,255,255,0.03)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    ...LABEL_ROW_SX,
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Save Readiness
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {readinessItems.map((item) => (
                    <Chip
                      key={item.label}
                      label={`${item.label}${item.optional ? ' optional' : ''}`}
                      size="small"
                      sx={{
                        color: item.ready ? '#D8FFF5' : 'rgba(255,255,255,0.8)',
                        bgcolor: item.ready
                          ? 'rgba(0, 196, 140, 0.14)'
                          : 'rgba(255,255,255,0.06)',
                        border: item.ready
                          ? '1px solid rgba(0, 196, 140, 0.3)'
                          : '1px solid rgba(255,255,255,0.12)',
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Box sx={FORM_SECTION_PANEL_SX}>
                <Typography
                  variant="caption"
                  sx={{
                    ...FORM_SECTION_HEADING_SX,
                    display: 'block',
                    mb: 1.25,
                  }}
                >
                  Essentials
                </Typography>
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
                      text="Category"
                      required
                      tooltip="Choose one category to organize this artifact."
                    />
                    <Autocomplete
                      options={[
                        ...PORTFOLIO_CATEGORY_OPTIONS,
                        PORTFOLIO_OTHER_CATEGORY_OPTION,
                      ]}
                      value={selectedCategory}
                      onChange={(_, next) => {
                        setSelectedCategory(next);
                        setFormData((prev) => ({
                          ...prev,
                          tech_stack:
                            next && next !== PORTFOLIO_OTHER_CATEGORY_OPTION
                              ? [next]
                              : next === PORTFOLIO_OTHER_CATEGORY_OPTION &&
                                  normalizedCustomCategory
                                ? [normalizedCustomCategory]
                                : [],
                        }));
                        if (
                          next &&
                          next !== PORTFOLIO_OTHER_CATEGORY_OPTION &&
                          isPredefinedProjectCategory(next)
                        ) {
                          setCustomCategory('');
                        }
                      }}
                      isOptionEqualToValue={(option, value) => option === value}
                      renderOption={(props, option) => (
                        <Box
                          component="li"
                          {...props}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                          }}
                        >
                          <Typography component="span" variant="body2">
                            {option}
                          </Typography>
                          {option === PORTFOLIO_OTHER_CATEGORY_OPTION ? (
                            <Box
                              component="span"
                              sx={{
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 999,
                                fontSize: '0.68rem',
                                letterSpacing: 0.35,
                                textTransform: 'uppercase',
                                color: '#9FE7FF',
                                bgcolor: 'rgba(0, 196, 204, 0.12)',
                                border: '1px solid rgba(0, 196, 204, 0.32)',
                              }}
                            >
                              Custom
                            </Box>
                          ) : null}
                        </Box>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          required
                          label="Category"
                          placeholder={
                            selectedCategory ? '' : 'Select a category'
                          }
                          helperText="Used to organize Portfolio Showcase sections."
                          variant="outlined"
                          size="small"
                          slotProps={{
                            htmlInput: {
                              ...params.inputProps,
                              'data-field-tooltip':
                                'Choose one category to organize this artifact.',
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
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.75, display: 'block' }}
                    >
                      {selectedCategory === PORTFOLIO_OTHER_CATEGORY_OPTION
                        ? 'Custom categories are stored exactly as entered.'
                        : 'Predefined categories stay grouped consistently across the portfolio.'}
                    </Typography>
                  </Box>

                  {selectedCategory === PORTFOLIO_OTHER_CATEGORY_OPTION && (
                    <Box>
                      <FieldLabel
                        text="Custom Category"
                        required
                        tooltip="Enter a custom category for projects that do not fit the predefined list."
                      />
                      <TextField
                        fullWidth
                        required
                        value={customCategory}
                        onChange={(e) => {
                          const nextValue = e.target.value.slice(
                            0,
                            MAX_CUSTOM_PROJECT_CATEGORY_LENGTH,
                          );
                          setCustomCategory(nextValue);
                          setFormData((prev) => ({
                            ...prev,
                            tech_stack: normalizeCustomProjectCategory(
                              nextValue,
                            )
                              ? [normalizeCustomProjectCategory(nextValue)]
                              : [],
                          }));
                        }}
                        placeholder="Enter custom category"
                        variant="outlined"
                        size="small"
                        error={Boolean(customCategoryError)}
                        helperText={
                          customCategoryError ||
                          `${normalizedCustomCategory.length}/${MAX_CUSTOM_PROJECT_CATEGORY_LENGTH} characters. Saved exactly as entered.`
                        }
                        inputProps={{
                          maxLength: MAX_CUSTOM_PROJECT_CATEGORY_LENGTH,
                          'aria-label': 'Custom Category',
                          'data-field-tooltip':
                            'Enter a custom category for projects that do not fit the predefined list.',
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 1 },
                          '& .MuiInputBase-input': { py: 1.35 },
                          '& .MuiFormHelperText-root': { mx: 0 },
                        }}
                      />
                    </Box>
                  )}

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
                      tooltip="Short summary shown in the project card and preview."
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={formData.description}
                      onChange={handleChange('description')}
                      placeholder="Describe the project outcome, your role, and impact."
                      variant="outlined"
                      size="small"
                      helperText="Optional. You can add this now or come back and edit it later."
                      inputProps={{
                        'aria-label': 'Description',
                        'data-field-tooltip':
                          'Short summary shown in the project card and preview.',
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 1 },
                        '& .MuiInputBase-inputMultiline': { py: 1.25 },
                        '& .MuiFormHelperText-root': { mx: 0 },
                      }}
                    />
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <Box
          sx={{
            mt: { xs: 2, md: 2.5 },
            ...FORM_SECTION_PANEL_SX,
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
