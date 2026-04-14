import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Tooltip,
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

/** Shown when backend returns 503 because RESEND_API_KEY is not set (e.g. UAT). */
const EMAIL_NOT_CONFIGURED_MESSAGE =
  'Email service is not configured. Please try again later or contact us directly.';
const ADVERTISE_CONTACT_EMAIL = 'info@wrdlnkdn.com';

function hasAnyAdvertiseFormData(data: {
  name: string;
  email: string;
  destinationUrl: string;
  message: string;
  adCopyDescription: string;
  iconFile: File | null;
}): boolean {
  return (
    data.name.trim() !== '' ||
    data.email.trim() !== '' ||
    data.destinationUrl.trim() !== '' ||
    data.message.trim() !== '' ||
    data.adCopyDescription.trim() !== '' ||
    data.iconFile !== null
  );
}

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
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const backgroundLocation = (
    location.state as { backgroundLocation?: RouterLocation } | null
  )?.backgroundLocation;

  const hasUnsavedChanges = hasAnyAdvertiseFormData({
    name,
    email,
    destinationUrl,
    message,
    adCopyDescription,
    iconFile,
  });

  const closeModal = () => {
    setConfirmCloseOpen(false);
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

  const requestClose = () => {
    if (hasUnsavedChanges) {
      setConfirmCloseOpen(true);
      return;
    }
    closeModal();
  };

  const handleConfirmSaveAndSend = () => {
    setConfirmCloseOpen(false);
    formRef.current?.requestSubmit();
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
        setError(EMAIL_NOT_CONFIGURED_MESSAGE);
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
    <>
      <Dialog
        open
        onClose={() => !submitting && requestClose()}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        aria-labelledby="advertise-dialog-title"
        aria-describedby="advertise-dialog-description"
        PaperProps={{
          component: 'form',
          ref: formRef,
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
        <DialogTitle
          id="advertise-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexShrink: 0,
            boxSizing: 'border-box',
            pt: 2.5,
            pr: 2,
            pb: 2,
            pl: 2.5,
          }}
        >
          <Typography
            variant="h4"
            component="span"
            sx={{
              fontWeight: 700,
              flex: 1,
              minWidth: 0,
              lineHeight: 1.25,
              pr: 1,
            }}
          >
            Advertise with us
          </Typography>
          <IconButton
            onClick={() => !submitting && requestClose()}
            disabled={submitting}
            aria-label="Close advertise modal"
            sx={{ flexShrink: 0, mt: -0.5, mr: -0.75 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          id="advertise-dialog-description"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
            gap: 2,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            px: 2.5,
            pt: 1,
            pb: 2,
            borderTop: 1,
            borderColor: 'divider',
            // Subtle track so the scrollbar isn’t a harsh white strip on dark UI.
            scrollbarGutter: 'stable',
            scrollbarWidth: 'thin',
            scrollbarColor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.28) rgba(255,255,255,0.06)'
                : `${theme.palette.action.selected} ${theme.palette.divider}`,
            '&::-webkit-scrollbar': { width: 8 },
            '&::-webkit-scrollbar-track': {
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.06)'
                  : theme.palette.action.hover,
              borderRadius: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.28)'
                  : theme.palette.action.selected,
              borderRadius: 4,
            },
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Interested in reaching the WRDLNKDN community? Send us a message.
          </Typography>

          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
              {error === EMAIL_NOT_CONFIGURED_MESSAGE ? (
                <Typography component="span" sx={{ display: 'block', mt: 1 }}>
                  You can still reach us at{' '}
                  <Link
                    href={`mailto:${ADVERTISE_CONTACT_EMAIL}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontWeight: 600 }}
                  >
                    {ADVERTISE_CONTACT_EMAIL}
                  </Link>
                  .
                </Typography>
              ) : null}
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
        </DialogContent>
        <DialogActions
          sx={{
            flexShrink: 0,
            px: 2.5,
            py: 2.5,
            pt: 2,
            gap: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <Button
            onClick={requestClose}
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
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        aria-labelledby="advertise-unsaved-title"
        aria-describedby="advertise-unsaved-description"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          id="advertise-unsaved-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
          }}
        >
          You have unsaved changes
          <Tooltip title="Close">
            <span>
              <IconButton
                aria-label="Close"
                onClick={() => setConfirmCloseOpen(false)}
                sx={{ color: 'rgba(255,255,255,0.75)' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="advertise-unsaved-description">
            You have unsaved changes. Are you sure you want to exit this form?
          </DialogContentText>
        </DialogContent>
        <DialogActions
          sx={{
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 1.5,
            px: 2,
            pb: 2,
            pt: 0,
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            useFlexGap
            sx={{ width: '100%' }}
          >
            <Button
              onClick={() => setConfirmCloseOpen(false)}
              color="inherit"
              variant="outlined"
              sx={{ flex: 1, minWidth: 0 }}
            >
              Continue editing
            </Button>
            <Button
              onClick={handleConfirmSaveAndSend}
              variant="contained"
              sx={{ flex: 1, minWidth: 0 }}
              disabled={
                submitting ||
                !isValidAdvertiserDestinationUrl(destinationUrl.trim()) ||
                !iconFile
              }
            >
              Save and send
            </Button>
          </Stack>
          <Button
            fullWidth
            onClick={closeModal}
            color="error"
            variant="outlined"
          >
            Discard and exit
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
