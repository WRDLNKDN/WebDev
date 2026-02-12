import {
  AddPhotoAlternate as AddPhotoIcon,
  Close as CloseIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import type { NewProject } from '../../types/portfolio';

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
  onSubmit: (project: NewProject, file?: File) => Promise<void>;
};

export const AddProjectDialog = ({
  open,
  onClose,
  onSubmit,
}: AddProjectDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<NewProject>({
    title: '',
    description: '',
    image_url: '',
    project_url: '',
    tech_stack: [],
  });

  const [techInput, setTechInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSubmitError(null);
  }, [open]);

  const handleChange =
    (field: keyof NewProject) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleAddTech = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && techInput.trim()) {
      e.preventDefault();
      setFormData((prev) => ({
        ...prev,
        tech_stack: [...prev.tech_stack, techInput.trim()],
      }));
      setTechInput('');
    }
  };

  const handleDeleteTech = (chipToDelete: string) => () => {
    setFormData((prev) => ({
      ...prev,
      tech_stack: prev.tech_stack.filter((chip) => chip !== chipToDelete),
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      setBusy(true);
      // Include any current tech input that wasn't yet added with Enter
      const techWithInput =
        techInput.trim() && !formData.tech_stack.includes(techInput.trim())
          ? [...formData.tech_stack, techInput.trim()]
          : formData.tech_stack;
      await onSubmit({ ...formData, tech_stack: techWithInput }, selectedFile);
      // Reset form
      setFormData({
        title: '',
        description: '',
        image_url: '',
        project_url: '',
        tech_stack: [],
      });
      setPreviewUrl(null);
      setSelectedFile(undefined);
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
      maxWidth="md"
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
              fontFamily: '"Poppins", sans-serif',
              letterSpacing: 1,
            }}
          >
            NEW{' '}
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

              <Stack direction="row" spacing={2} alignItems="center">
                <LinkIcon sx={{ color: 'text.secondary' }} />
                <TextField
                  fullWidth
                  required
                  label="Project URL"
                  value={formData.project_url}
                  onChange={handleChange('project_url')}
                  variant="filled"
                  size="small"
                />
              </Stack>

              <Box>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <CodeIcon sx={{ color: 'text.secondary' }} />
                  <TextField
                    fullWidth
                    required
                    label="Tech Stack (Press Enter to add at least one)"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={handleAddTech}
                    variant="filled"
                    size="small"
                    helperText={
                      formData.tech_stack.length === 0 && !techInput.trim()
                        ? 'Type at least one tech (or press Enter to add multiple)'
                        : undefined
                    }
                  />
                </Stack>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.tech_stack.map((tech) => (
                    <Chip
                      key={tech}
                      label={tech}
                      onDelete={handleDeleteTech(tech)}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
                    />
                  ))}
                </Box>
              </Box>
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
              (formData.tech_stack.length === 0 && !techInput.trim())
            }
            startIcon={<SaveIcon />}
            sx={{ bgcolor: '#7D2AE8', '&:hover': { bgcolor: '#FF22C9' } }}
          >
            Add to Portfolio
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
