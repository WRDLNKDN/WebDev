import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import {
  useLocation,
  useNavigate,
  type Location as RouterLocation,
} from 'react-router-dom';
import {
  isValidAdvertiserDestinationUrl,
  validateAdvertiseFields,
  type AdvertiseFieldErrors,
} from '../../lib/marketing/advertiseValidation';

const ICON_MAX_BYTES = 5 * 1024 * 1024;
const ICON_ACCEPT = '.png,.svg,image/png,image/svg+xml';

/**
 * Advertise with us - route-mounted modal form.
 * Sends to info@wrdlnkdn.com via API with destination URL and icon/logo upload.
 */
export const AdvertisePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [message, setMessage] = useState('');
  const [adCopyDescription, setAdCopyDescription] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AdvertiseFieldErrors>({});
  const iconInputRef = useRef<HTMLInputElement>(null);
  const backgroundLocation = (
    location.state as { backgroundLocation?: RouterLocation } | null
  )?.backgroundLocation;

  const closeModal = () => {
    if (backgroundLocation) {
      navigate(
        {
          pathname: backgroundLocation.pathname,
          search: backgroundLocation.search,
          hash: backgroundLocation.hash,
        },
        { replace: true },
      );
      return;
    }
    navigate('/', { replace: true });
  };

  const clearFieldError = (field: keyof AdvertiseFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setIconFile(file ?? null);
    setIconPreview(null);
    clearFieldError('icon');
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setIconPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearIcon = () => {
    setIconFile(null);
    setIconPreview(null);
    clearFieldError('icon');
    if (iconInputRef.current) iconInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedDestinationUrl = destinationUrl.trim();
    const trimmedMessage = message.trim();
    const trimmedAdCopy = adCopyDescription.trim();

    const nextFieldErrors = validateAdvertiseFields({
      name: trimmedName,
      email: trimmedEmail,
      destinationUrl: trimmedDestinationUrl,
      message: trimmedMessage,
      adCopyDescription: trimmedAdCopy,
      iconFile,
    });
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) return;

    if (!iconFile) return;
    if (iconFile.size > ICON_MAX_BYTES) {
      setError('Icon must be 5MB or less.');
      return;
    }
    const validMimes = ['image/png', 'image/svg+xml'];
    if (!validMimes.includes(iconFile.type)) {
      setError('Icon must be PNG or SVG.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', trimmedName);
      formData.append('email', trimmedEmail);
      formData.append('destinationUrl', trimmedDestinationUrl);
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
        setName('');
        setEmail('');
        setDestinationUrl('');
        setMessage('');
        setAdCopyDescription('');
        clearIcon();
        closeModal();
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

  const destinationUrlHasValue = destinationUrl.trim().length > 0;
  const destinationUrlIsInvalid =
    destinationUrlHasValue &&
    !isValidAdvertiserDestinationUrl(destinationUrl.trim());

  return (
    <Dialog
      open
      onClose={() => !submitting && closeModal()}
      fullWidth
      maxWidth="sm"
      aria-labelledby="advertise-dialog-title"
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
        sx: {
          maxHeight: 'min(92vh, 860px)',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          mx: { xs: 1.5, sm: 2 },
          width: { xs: 'calc(100% - 24px)', sm: '100%' },
        },
      }}
    >
      <DialogTitle id="advertise-dialog-title" sx={{ pr: 6, pb: 1.25 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Advertise with us
        </Typography>
        <IconButton
          onClick={closeModal}
          disabled={submitting}
          aria-label="Close advertise modal"
          sx={{ position: 'absolute', right: 10, top: 10 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Interested in reaching the WRDLNKDN community? Send us a message.
        </Typography>

        {error ? (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError('name');
            }}
            variant="outlined"
            error={Boolean(fieldErrors.name)}
            helperText={fieldErrors.name}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError('email');
            }}
            variant="outlined"
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
          />
          <TextField
            fullWidth
            required
            label="Destination Link"
            type="url"
            value={destinationUrl}
            onChange={(e) => {
              setDestinationUrl(e.target.value);
              clearFieldError('destinationUrl');
            }}
            variant="outlined"
            placeholder="https://example.com"
            error={
              Boolean(fieldErrors.destinationUrl) || destinationUrlIsInvalid
            }
            helperText={
              fieldErrors.destinationUrl ??
              (destinationUrlIsInvalid
                ? 'Enter a valid https:// destination URL.'
                : 'Use the full https:// URL for the destination site.')
            }
          />
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={4}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              clearFieldError('message');
            }}
            variant="outlined"
            error={Boolean(fieldErrors.message)}
            helperText={fieldErrors.message}
          />
          <TextField
            fullWidth
            label="Brief Description of Your Ad Copy"
            multiline
            rows={3}
            value={adCopyDescription}
            onChange={(e) => {
              setAdCopyDescription(e.target.value);
              clearFieldError('adCopyDescription');
            }}
            variant="outlined"
            required
            error={Boolean(fieldErrors.adCopyDescription)}
            helperText={
              fieldErrors.adCopyDescription ??
              'Provide a short summary of the messaging, tone, and intended call-to-action.'
            }
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
              sx={{ mt: 1, flexWrap: 'wrap' }}
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
              {iconFile ? (
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
              ) : null}
            </Stack>
            {fieldErrors.icon ? (
              <Typography
                variant="caption"
                color="error.main"
                sx={{ display: 'block', mt: 1 }}
              >
                {fieldErrors.icon}
              </Typography>
            ) : null}
            {iconPreview ? (
              <Box
                component="img"
                src={iconPreview}
                alt="Selected advertiser icon preview"
                sx={{
                  mt: 2,
                  width: 96,
                  height: 96,
                  objectFit: 'contain',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  p: 1,
                }}
              />
            ) : null}
          </Box>

          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            spacing={1.5}
            justifyContent="flex-end"
          >
            <Button
              onClick={closeModal}
              disabled={submitting}
              color="inherit"
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                submitting || !isValidAdvertiserDestinationUrl(destinationUrl)
              }
            >
              {submitting ? (
                <>
                  <CircularProgress size={18} sx={{ mr: 1.25 }} />
                  Sending...
                </>
              ) : (
                'Send request'
              )}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
