import { Close as CloseIcon } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Box,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeProjectCategories } from '../../../lib/portfolio/categoryUtils';
import {
  getPortfolioUrlSafetyError,
  validatePortfolioUrl,
} from '../../../lib/portfolio/linkValidation';
import { normalizeUrlForDedup } from '../../../lib/utils/linkPlatform';
import { toMessage } from '../../../lib/utils/errors';
import type { NewProject, PortfolioItem } from '../../../types/portfolio';
import {
  AddProjectDialogSections,
  GLASS_MODAL_STYLE,
  SOLO_GRADIENT_STYLE,
} from './addProjectDialogSections';

type AddProjectDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    project: NewProject,
    file?: File,
    projectId?: string,
  ) => Promise<void>;
  initialProject?: PortfolioItem | null;
  projectId?: string;
  existingProjects?: PortfolioItem[];
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

  const isEdit = Boolean(initialProject && projectId);

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
        initialProject.image_url?.trim() ? initialProject.image_url : null,
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
    if (!e.target.files?.[0]) return;
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
  };

  const isExternalUrl = (url: string) => /^https?:\/\//i.test(url.trim());
  const normalizedCategories = normalizeProjectCategories(formData.tech_stack);
  const url = formData.project_url.trim();
  const initialNormalizedUrl =
    isEdit && initialProject?.project_url
      ? normalizeUrlForDedup(initialProject.project_url.trim())
      : '';
  const hasTitle = Boolean(formData.title.trim());
  const hasDescription = Boolean(formData.description.trim());
  const hasCategories = normalizedCategories.length > 0;
  const hasUrl = Boolean(url);
  const hasValidProtocol = !hasUrl || isExternalUrl(url);
  const urlSafetyError =
    hasUrl && hasValidProtocol ? getPortfolioUrlSafetyError(url) : '';
  const normalizedFormUrl = hasUrl ? normalizeUrlForDedup(url) : '';
  const isUrlChangedFromInitial =
    !isEdit || normalizedFormUrl !== initialNormalizedUrl;

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
      isUrlChangedFromInitial &&
      existingProjects.some(
        (p) =>
          p.id !== projectId &&
          normalizeUrlForDedup(p.project_url?.trim() ?? '') ===
            normalizedFormUrl,
      ),
  );
  const isDuplicateLinkUrl = Boolean(
    normalizedFormUrl &&
      isUrlChangedFromInitial &&
      normalizedLinkUrls.has(normalizedFormUrl),
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
            : urlSafetyError || '';

  const blockers: string[] = [];
  if (!hasTitle) blockers.push('add a project name');
  if (!hasDescription) blockers.push('add a description');
  if (!hasCategories) blockers.push('select at least one category');
  if (!hasUrl) blockers.push('add a project URL');
  if (hasUrl && !hasValidProtocol) blockers.push('fix URL format (http/https)');
  if (urlSafetyError) blockers.push('use a professional project URL');
  if (isDuplicateProjectUrl || isDuplicateLinkUrl)
    blockers.push('use a different project URL');

  const handleSubmit = async () => {
    setSubmitError(null);
    const rawUrl = formData.project_url?.trim() ?? '';
    const validation = await validatePortfolioUrl(rawUrl, {
      checkAccessible: isUrlChangedFromInitial,
    });
    if (!validation.ok) {
      setSubmitError(validation.error);
      return;
    }

    const normalizedUrl = normalizeUrlForDedup(rawUrl);
    if (normalizedUrl && isUrlChangedFromInitial) {
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
        sx: { ...GLASS_MODAL_STYLE, width: { md: 'min(980px, 96vw)' } },
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
              fontFamily: '"Poppins", sans-serif',
            }}
          >
            {isEdit ? 'EDIT ' : 'NEW '}
            <Box
              component="span"
              sx={{
                background: SOLO_GRADIENT_STYLE,
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

      <AddProjectDialogSections
        formData={formData}
        setFormData={setFormData}
        handleChange={handleChange}
        fileInputRef={fileInputRef}
        previewUrl={previewUrl}
        previewLoadFailed={previewLoadFailed}
        setPreviewLoadFailed={setPreviewLoadFailed}
        handleFileSelect={handleFileSelect}
        urlTouched={urlTouched}
        setUrlTouched={setUrlTouched}
        urlErrorMessage={urlErrorMessage}
        submitError={submitError}
        blockers={blockers}
        busy={busy}
        isEdit={isEdit}
        onClose={onClose}
        onSubmit={() => void handleSubmit()}
      />
    </Dialog>
  );
};
