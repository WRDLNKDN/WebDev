import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

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

const BUMPER_FROM_JOIN = '/bumper?from=join&next=/feed';

const ProfileStep = () => {
  const navigate = useNavigate();
  const {
    state,
    setProfile,
    goToStep,
    completeStep,
    submitRegistration,
    submitting,
    submitError,
    clearSubmitError,
    resetSignup,
  } = useSignup();

  const [displayName, setDisplayName] = useState(
    state.profile?.displayName ?? '',
  );
  const [marketingOptIn, setMarketingOptIn] = useState(
    state.profile?.marketingOptIn ?? false,
  );

  const [localError, setLocalError] = useState<string | null>(null);

  const combinedError = localError ?? submitError;

  const handleDismissError = () => {
    setLocalError(null);
    clearSubmitError();
  };

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
      marketingOptIn,
    };

    setProfile(profileData);

    try {
      await submitRegistration(profileData);
      completeStep('profile');
      resetSignup();
      navigate(BUMPER_FROM_JOIN, { replace: true });
    } catch {
      // submitError is shown below
    }
  };

  const handleBack = () => {
    setProfile({
      displayName: displayName.trim(),
      marketingOptIn,
    });
    goToStep('values');
  };

  return (
    <Stack
      spacing={4}
      sx={{
        ...profileStep,
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        '& .MuiFormControl-root, .MuiAutocomplete-root': {
          minWidth: 0,
        },
      }}
    >
      <Box>
        <Typography variant="h4" sx={profileStepTitle}>
          Create your public profile
        </Typography>
        <Typography variant="body1" sx={profileStepSubtext}>
          This is how you&apos;ll appear in the community.
        </Typography>
      </Box>

      {combinedError && (
        <Alert
          severity="error"
          onClose={handleDismissError}
          sx={profileStepAlert}
        >
          {combinedError}
        </Alert>
      )}

      <TextField
        label="Public display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        fullWidth
        placeholder="How should we call you?"
        helperText="This name will be visible across the community."
        required
        error={!displayName.trim() && displayName.length > 0}
        sx={profileStepTextField}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            color="primary"
          />
        }
        label={
          <Typography variant="body2" sx={profileStepTipText}>
            I agree to receive occasional emails from WRDLNKDN (product updates,
            events, community news). I can unsubscribe anytime. See{' '}
            <Link
              component={RouterLink}
              to="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              underline="hover"
            >
              Privacy
            </Link>{' '}
            and{' '}
            <Link
              component={RouterLink}
              to="/terms"
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              underline="hover"
            >
              Terms
            </Link>
            .
          </Typography>
        }
        sx={{ alignItems: 'flex-start', mt: 1 }}
      />

      <Box sx={profileStepTipBox}>
        <Typography variant="body2" sx={profileStepTipText}>
          Profiles are reviewed to protect the integrity of the community.
          We&apos;ll notify you when yours is live.
        </Typography>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={profileStepButtonRow}
      >
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
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </Stack>
    </Stack>
  );
};

export { ProfileStep };
export default ProfileStep;
