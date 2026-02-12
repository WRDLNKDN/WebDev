import {
  AddPhotoAlternate as AddPhotoIcon,
  Close as CloseIcon,
  Link as LinkIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { toMessage } from '../../lib/errors';
import type { NewProject, PortfolioItem } from '../../types/portfolio';

// REUSING THE VIBE
const SOLO_GRADIENT =
  'linear-gradient(90deg, #00C4CC 0%, #7D2AE8 50%, #FF22C9 100%)';
const GLASS_MODAL = {
  bgcolor: '#141414',
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0))',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: 3,
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
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEdit = Boolean(initialProject && projectId);

  useEffect(() => {
    if (open) setSubmitError(null);
  }, [open]);

  useEffect(() => {
    if (open && initialProject) {
      setFormData({
        title: initialProject.title,
        description: initialProject.description ?? '',
        image_url: initialProject.image_url ?? '',
        project_url: initialProject.project_url ?? '',
        tech_stack: initialProject.tech_stack ?? [],
      });
      setPreviewUrl(initialProject.image_url ?? null);
    } else if (open && !initialProject) {
      setFormData(emptyForm);
      setPreviewUrl(null);
      setSelectedFile(undefined);
    }
  }, [open, initialProject]);

  const handleChange =
    (field: keyof NewProject) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const isExternalUrl = (url: string) => /^https?:\/\//i.test(url.trim());

  const handleSubmit = async () => {
    setSubmitError(null);
    const url = formData.project_url?.trim() ?? '';
    if (!isExternalUrl(url)) {
      setSubmitError('Project URL must be an external URL (e.g. https://...).');
      return;
    }
    try {
      setBusy(true);
      await onSubmit(
        { ...formData, tech_stack: formData.tech_stack ?? [] },
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
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: GLASS_MODAL }}
    >
      <DialogTitle
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', p: 3 }}
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
              letterSpacing: 1,
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

      <DialogContent sx={{ p: { xs: 2, md: 4 } }}>
        <Grid container spacing={4} sx={{ mt: 0 }}>
          {/* IMAGE UPLOAD COLUMN */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                height: 250,
                border: '2px dashed rgba(255,255,255,0.2)',
                borderRadius: 2,
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
              {previewUrl ? (
                <Box
                  component="img"
                  src={previewUrl}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <AddPhotoIcon
                    sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Upload Screenshot (optional)
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
          </Grid>

          {/* FORM COLUMN */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                required
                label="Project Title"
                value={formData.title}
                onChange={handleChange('title')}
                variant="filled"
              />

              <TextField
                fullWidth
                required
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleChange('description')}
                variant="filled"
              />

              <Stack direction="row" spacing={2} alignItems="flex-start">
                <LinkIcon sx={{ color: 'text.secondary', mt: 1.5 }} />
                <TextField
                  fullWidth
                  required
                  label="Project URL"
                  placeholder="https://example.com/my-project"
                  helperText="External URL only (e.g. https://...). Internal paths are not allowed."
                  value={formData.project_url}
                  onChange={handleChange('project_url')}
                  variant="filled"
                  size="small"
                  error={
                    !!formData.project_url &&
                    !/^https?:\/\//i.test(formData.project_url.trim())
                  }
                />
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        {submitError && (
          <Alert
            severity="error"
            onClose={() => setSubmitError(null)}
            sx={{ mt: 2 }}
          >
            {submitError}
          </Alert>
        )}
        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={2}
          sx={{ mt: 4 }}
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
            disabled={
              busy ||
              !formData.title.trim() ||
              !formData.description.trim() ||
              !formData.project_url.trim() ||
              !isExternalUrl(formData.project_url.trim())
            }
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
