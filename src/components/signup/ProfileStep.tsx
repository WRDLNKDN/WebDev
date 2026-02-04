import { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';

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

    // Save profile data to state
    setProfile(profileData);

    try {
      // Pass profile data directly to avoid stale state
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
    <Stack spacing={4} sx={{ maxWidth: 600, mx: 'auto' }}>
      <Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 1,
            color: '#ffffff',
          }}
        >
          Create Your Profile
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          This is what will appear in the directory after approval.
        </Typography>
      </Box>

      {(localError || submitError) && (
        <Alert
          severity="error"
          onClose={() => setLocalError(null)}
          sx={{
            bgcolor: 'rgba(211, 47, 47, 0.15)',
            border: '1px solid rgba(211, 47, 47, 0.3)',
            color: 'rgba(255,255,255,0.9)',
            '& .MuiAlert-icon': {
              color: '#f44336',
            },
          }}
        >
          {localError ?? submitError}
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
        sx={{
          '& .MuiOutlinedInput-root': {
            color: '#ffffff',
            bgcolor: 'rgba(0,0,0,0.3)',
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4CAF50',
            },
            '&.Mui-error fieldset': {
              borderColor: '#f44336',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255,255,255,0.7)',
            '&.Mui-focused': {
              color: '#4CAF50',
            },
            '&.Mui-error': {
              color: '#f44336',
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'rgba(255,255,255,0.5)',
            opacity: 1,
          },
          '& .MuiFormHelperText-root': {
            color: 'rgba(255,255,255,0.6)',
            '&.Mui-error': {
              color: '#f44336',
            },
          },
        }}
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
        sx={{
          '& .MuiOutlinedInput-root': {
            color: '#ffffff',
            bgcolor: 'rgba(0,0,0,0.3)',
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4CAF50',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255,255,255,0.7)',
            '&.Mui-focused': {
              color: '#4CAF50',
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'rgba(255,255,255,0.5)',
            opacity: 1,
          },
          '& .MuiFormHelperText-root': {
            color: 'rgba(255,255,255,0.6)',
          },
        }}
      />

      <Box
        sx={{
          p: 2,
          bgcolor: 'rgba(33, 150, 243, 0.1)',
          borderRadius: 2,
          border: '1px solid rgba(33, 150, 243, 0.2)',
        }}
      >
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          💡 <strong>Your profile will be reviewed by admins</strong> before
          {' appearing in the directory. We’ll notify you once it’s approved!'}
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
        <Button
          variant="text"
          onClick={handleBack}
          disabled={submitting}
          sx={{
            color: 'rgba(255,255,255,0.7)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.05)',
            },
            '&:disabled': {
              color: 'rgba(255,255,255,0.3)',
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
          sx={{
            flex: 1,
            bgcolor: '#4CAF50',
            color: '#ffffff',
            fontSize: '1.05rem',
            '&:hover': {
              bgcolor: '#45a049',
            },
            '&:disabled': {
              bgcolor: 'rgba(76, 175, 80, 0.3)',
              color: 'rgba(255,255,255,0.5)',
            },
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Registration'}
        </Button>
      </Stack>
    </Stack>
  );
};

export { ProfileStep };
export default ProfileStep;
