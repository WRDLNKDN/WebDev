import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
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
import { AdvertiseIconField } from './AdvertiseIconField';
import { AdvertiseRequestFields } from './AdvertiseRequestFields';

const ICON_MAX_BYTES = 5 * 1024 * 1024;
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
      scroll="paper"
      aria-labelledby="advertise-dialog-title"
      aria-describedby="advertise-dialog-description"
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
        sx: {
          maxHeight: 'min(92vh, 860px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
        id="advertise-dialog-description"
        dividers
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0,
          gap: 2,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
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

        <AdvertiseRequestFields
          name={name}
          email={email}
          destinationUrl={destinationUrl}
          destinationUrlIsInvalid={destinationUrlIsInvalid}
          message={message}
          adCopyDescription={adCopyDescription}
          fieldErrors={fieldErrors}
          onNameChange={(value) => {
            setName(value);
            clearFieldError('name');
          }}
          onEmailChange={(value) => {
            setEmail(value);
            clearFieldError('email');
          }}
          onDestinationUrlChange={(value) => {
            setDestinationUrl(value);
            clearFieldError('destinationUrl');
          }}
          onMessageChange={(value) => {
            setMessage(value);
            clearFieldError('message');
          }}
          onAdCopyDescriptionChange={(value) => {
            setAdCopyDescription(value);
            clearFieldError('adCopyDescription');
          }}
        />
        <AdvertiseIconField
          iconFile={iconFile}
          iconPreview={iconPreview}
          iconInputRef={iconInputRef}
          fieldError={fieldErrors.icon}
          submitting={submitting}
          onFileChange={handleIconChange}
          onClear={clearIcon}
        />

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
              submitting ||
              !isValidAdvertiserDestinationUrl(destinationUrl.trim())
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
      </DialogContent>
    </Dialog>
  );
};
