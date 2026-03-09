import { Stack, TextField } from '@mui/material';
import type { AdvertiseFieldErrors } from '../../lib/marketing/advertiseValidation';

type AdvertiseRequestFieldsProps = {
  name: string;
  email: string;
  destinationUrl: string;
  destinationUrlIsInvalid: boolean;
  message: string;
  adCopyDescription: string;
  fieldErrors: AdvertiseFieldErrors;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onDestinationUrlChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onAdCopyDescriptionChange: (value: string) => void;
};

export const AdvertiseRequestFields = ({
  name,
  email,
  destinationUrl,
  destinationUrlIsInvalid,
  message,
  adCopyDescription,
  fieldErrors,
  onNameChange,
  onEmailChange,
  onDestinationUrlChange,
  onMessageChange,
  onAdCopyDescriptionChange,
}: AdvertiseRequestFieldsProps) => (
  <Stack spacing={2}>
    <TextField
      fullWidth
      label="Name"
      value={name}
      onChange={(e) => onNameChange(e.target.value)}
      variant="outlined"
      error={Boolean(fieldErrors.name)}
      helperText={fieldErrors.name}
    />
    <TextField
      fullWidth
      label="Email"
      type="email"
      value={email}
      onChange={(e) => onEmailChange(e.target.value)}
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
      onChange={(e) => onDestinationUrlChange(e.target.value)}
      variant="outlined"
      placeholder="https://example.com"
      error={Boolean(fieldErrors.destinationUrl) || destinationUrlIsInvalid}
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
      onChange={(e) => onMessageChange(e.target.value)}
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
      onChange={(e) => onAdCopyDescriptionChange(e.target.value)}
      variant="outlined"
      required
      error={Boolean(fieldErrors.adCopyDescription)}
      helperText={
        fieldErrors.adCopyDescription ??
        'Provide a short summary of the messaging, tone, and intended call-to-action.'
      }
    />
  </Stack>
);
