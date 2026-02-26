import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';

const ICON_MAX_BYTES = 5 * 1024 * 1024;
const ICON_ACCEPT = '.png,.svg,image/png,image/svg+xml';

/**
 * Advertise with us – contact form. Sends to info@wrdlnkdn.com via API
 * with Ad Copy Description and Icon/Logo upload.
 */
export const AdvertisePage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [adCopyDescription, setAdCopyDescription] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setIconFile(file ?? null);
    setIconPreview(null);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setIconPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearIcon = () => {
    setIconFile(null);
    setIconPreview(null);
    if (iconInputRef.current) iconInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    const trimmedAdCopy = adCopyDescription.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!trimmedMessage || trimmedMessage.length < 10) {
      setError('Message must be at least 10 characters');
      return;
    }
    if (!trimmedAdCopy || trimmedAdCopy.length < 10) {
      setError('Ad Copy Description must be at least 10 characters');
      return;
    }
    if (!iconFile) {
      setError('Icon/logo file is required');
      return;
    }
    if (iconFile.size > ICON_MAX_BYTES) {
      setError('Icon must be 5MB or less');
      return;
    }
    const validMimes = ['image/png', 'image/svg+xml'];
    if (!validMimes.includes(iconFile.type)) {
      setError('Icon must be PNG or SVG');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', trimmedName);
      formData.append('email', trimmedEmail);
      formData.append('message', trimmedMessage);
      formData.append('adCopyDescription', trimmedAdCopy);
      formData.append('icon', iconFile);

      const res = await fetch('/api/advertise/request', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (res.ok && data.ok) {
        setSuccess(true);
        setName('');
        setEmail('');
        setMessage('');
        setAdCopyDescription('');
        clearIcon();
        return;
      }

      if (res.status === 503) {
        setError(
          'Email service is not configured. Please try again later or contact us directly.',
        );
        return;
      }

      setError(
        typeof data.message === 'string'
          ? data.message
          : (data.error ?? 'Something went wrong. Please try again.'),
      );
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Advertise with us
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Interested in reaching the WRDLNKDN community? Send us a message.
          </Typography>
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Your request was sent to info@wrdlnkdn.com. We&apos;ll be in
              touch.
            </Alert>
          )}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Brief Description of Your Ad Copy"
              multiline
              rows={3}
              value={adCopyDescription}
              onChange={(e) => setAdCopyDescription(e.target.value)}
              variant="outlined"
              required
              helperText="Provide a short summary of the messaging, tone, and intended call-to-action."
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Upload Your Icon or Logo *
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
              >
                PNG or SVG preferred. Max 5MB. Transparent background and square
                format recommended.
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ mt: 1 }}
              >
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  disabled={submitting}
                >
                  {iconFile ? 'Change file' : 'Choose file'}
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept={ICON_ACCEPT}
                    hidden
                    onChange={handleIconChange}
                  />
                </Button>
                {iconFile && (
                  <>
                    <Typography variant="body2">
                      {iconFile.name} ({(iconFile.size / 1024).toFixed(1)} KB)
                    </Typography>
                    <Button
                      size="small"
                      color="secondary"
                      onClick={clearIcon}
                      disabled={submitting}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </Stack>
              {iconPreview && (
                <Box
                  component="img"
                  src={iconPreview}
                  alt="Icon preview"
                  sx={{
                    mt: 1.5,
                    maxWidth: 80,
                    maxHeight: 80,
                    objectFit: 'contain',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                />
              )}
            </Box>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={
                submitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : null
              }
              sx={{ alignSelf: 'flex-start' }}
            >
              {submitting ? 'Sending…' : 'Send request'}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
