import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import {
  profileStep,
  profileStepAlert,
  profileStepBackButton,
  profileStepButtonRow,
  profileStepSubmitButton,
  profileStepSubtext,
  profileStepTextField,
  profileStepTipBox,
  profileStepTipText,
  profileStepTitle,
} from '../../theme/signupStyles';
import { useSignup } from '../../context/useSignup';

const ProfileStep = () => {
  const {
    state,
    setProfile,
    goToStep,
    completeStep,
    submitRegistration,
    submitting,
    submitError,
  } = useSignup();

  const [displayName, setDisplayName] = useState(
    state.profile?.displayName ?? '',
  );
  const [tagline, setTagline] = useState(state.profile?.tagline ?? '');

  const [localError, setLocalError] = useState<string | null>(null);

  const combinedError = localError ?? submitError;
  const friendlyError =
    combinedError && !localError
      ? 'Something went wrong while submitting your profile. Please try again in a moment — your answers on this step are still here.'
      : combinedError;

  const handleContinue = async () => {
    setLocalError(null);

    if (!displayName.trim()) {
      setLocalError('Display name is required');
      return;
    }

    if (displayName.trim().length < 2) {
      setLocalError('Display name must be at least 2 characters');
      return;
    }

    const profileData = {
      displayName: displayName.trim(),
      tagline: tagline.trim(),
    };

    setProfile(profileData);

    try {
      await submitRegistration(profileData);
      completeStep('profile');
      goToStep('complete');
    } catch {
      // submitError is shown below
    }
  };

  const handleBack = () => {
    setProfile({
      displayName: displayName.trim(),
      tagline: tagline.trim(),
    });
    goToStep('values');
  };

  return (
    <Stack spacing={4} sx={profileStep}>
      <Box>
        <Typography variant="h4" sx={profileStepTitle}>
          Create Your Profile
        </Typography>
        <Typography variant="body1" sx={profileStepSubtext}>
          This is what will appear in the directory after approval.
        </Typography>
      </Box>

      {combinedError && (
        <Alert
          severity="error"
          onClose={() => setLocalError(null)}
          sx={profileStepAlert}
        >
          {friendlyError}
        </Alert>
      )}

      <TextField
        label="Display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        fullWidth
        placeholder="How should we call you?"
        helperText="This is your public name in the directory"
        required
        error={!displayName.trim() && displayName.length > 0}
        sx={profileStepTextField}
      />

      <TextField
        label="Tagline"
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
        fullWidth
        multiline
        rows={2}
        placeholder="One-liner about you (optional)"
        helperText="Optional: A short description or fun fact about yourself"
        sx={profileStepTextField}
      />

      <Box sx={profileStepTipBox}>
        <Typography variant="body2" sx={profileStepTipText}>
          💡 <strong>Your profile will be reviewed by admins</strong> before
          {
            " appearing in the directory. We will notify you once it's approved!"
          }
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} sx={profileStepButtonRow}>
        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={submitting}
          sx={{
            ...profileStepBackButton,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.6)',
            color: '#fff',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.85)',
              bgcolor: 'rgba(255,255,255,0.08)',
            },
            '&.Mui-disabled': {
              borderColor: 'rgba(255,255,255,0.35)',
              color: 'rgba(255,255,255,0.6)',
            },
          }}
        >
          Back
        </Button>

        <Button
          variant="contained"
          onClick={() => void handleContinue()}
          disabled={submitting || !displayName.trim()}
          startIcon={
            submitting ? (
              <CircularProgress size={18} sx={{ color: '#ffffff' }} />
            ) : null
          }
          sx={profileStepSubmitButton}
        >
          {submitting ? 'Submitting…' : 'Submit Registration'}
        </Button>
      </Stack>
    </Stack>
  );
};

export { ProfileStep };
export default ProfileStep;
