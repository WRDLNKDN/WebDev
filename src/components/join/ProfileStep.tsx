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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useJoin } from '../../context/useJoin';
import { setJoinCompletionFlash } from '../../lib/profile/joinCompletionFlash';
import { setProfileValidated } from '../../lib/profile/profileValidatedCache';
import { POLICY_VERSION } from '../../types/join';

/** Format a "Joined Month Year" string from the current date. */
function joinedLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

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
  } = useJoin();

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

  const handleLaunch = async () => {
    setLocalError(null);

    if (!displayName.trim()) {
      setLocalError('Display name is required');
      return;
    }
    if (displayName.trim().length < 2) {
      setLocalError('Display name must be at least 2 characters');
      return;
    }

    const profileData = { displayName: displayName.trim(), marketingOptIn };
    setProfile(profileData);

    try {
      await submitRegistration(profileData);
      completeStep('profile');

      if (state.identity?.userId) {
        setProfileValidated(state.identity.userId, {
          display_name: displayName.trim(),
          join_reason: state.values?.joinReason ?? [],
          participation_style: state.values?.participationStyle ?? [],
          policy_version: POLICY_VERSION,
        });
      }

      void import('../../pages/feed/Feed').catch(() => {});
      setJoinCompletionFlash();
      navigate(
        { pathname: '/bumper', search: '?from=join&next=/feed' },
        { replace: true },
      );
    } catch {
      // submitError shown below
    }
  };

  const handleBack = () => {
    setProfile({ displayName: displayName.trim(), marketingOptIn });
    goToStep('values');
  };

  // Preview name: what the card will show
  const previewName = displayName.trim() || 'Your Name';

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        px: { xs: 2, sm: 3 },
        py: { xs: 2, md: 2.5 },
      }}
    >
      <Stack
        spacing={3}
        sx={{ width: '100%', maxWidth: 520, alignItems: 'center' }}
      >
        {/* Hero text */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: '#fff',
              mb: 1,
              fontSize: { xs: '1.75rem', sm: '2.1rem' },
              letterSpacing: '-0.01em',
            }}
          >
            You&apos;re almost in.
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#fff',
              mb: 1.25,
              fontSize: { xs: '1rem', sm: '1.15rem' },
            }}
          >
            Choose how you&apos;ll show up in{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
              }}
            >
              WRDLNKDN
            </Box>
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}
          >
            Pick a name that feels authentic. This is how your profile will be
            seen in the community.
          </Typography>
        </Box>

        {/* Error */}
        {combinedError && (
          <Alert
            severity="error"
            onClose={handleDismissError}
            sx={{
              width: '100%',
              bgcolor: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: 'rgba(255,255,255,0.9)',
              '& .MuiAlert-icon': { color: '#ef4444' },
            }}
          >
            {combinedError}
          </Alert>
        )}

        {/* Name input */}
        <TextField
          label="Your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          fullWidth
          placeholder="How should we call you?"
          required
          error={!displayName.trim() && displayName.length > 0}
          helperText={
            !displayName.trim() && displayName.length > 0
              ? 'Name is required'
              : 'Visible across the community'
          }
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              bgcolor: 'rgba(255,255,255,0.04)',
              borderRadius: 1.5,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(255,255,255,0.6)',
              '&.Mui-focused': { color: '#38bdf8' },
            },
            '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.4)' },
            '& .MuiInputBase-input::placeholder': {
              color: 'rgba(255,255,255,0.25)',
              opacity: 1,
            },
          }}
        />

        {/* Profile preview card */}
        <Box
          sx={{
            width: '100%',
            borderRadius: 2.5,
            border: '1.5px solid rgba(56,189,248,0.45)',
            bgcolor: 'rgba(10,14,28,0.7)',
            p: { xs: 2.5, sm: 3 },
            backdropFilter: 'blur(20px)',
            boxShadow:
              '0 0 32px rgba(56,189,248,0.12), inset 0 1px 0 rgba(56,189,248,0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at 30% 0%, rgba(56,189,248,0.06) 0%, transparent 65%)',
              pointerEvents: 'none',
            },
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.75,
              letterSpacing: '-0.01em',
              wordBreak: 'break-word',
            }}
          >
            {previewName}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.55)', mb: 0.5 }}
          >
            Member
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}
          >
            Joined {joinedLabel()}
          </Typography>
        </Box>

        {/* Marketing opt-in */}
        <FormControlLabel
          sx={{ alignSelf: 'flex-start', alignItems: 'flex-start' }}
          control={
            <Checkbox
              checked={marketingOptIn}
              onChange={(e) => {
                setMarketingOptIn(e.target.checked);
                setLocalError(null);
              }}
              size="small"
              sx={{
                mt: '-2px',
                color: 'rgba(255,255,255,0.3)',
                '&.Mui-checked': { color: '#38bdf8' },
                p: '6px',
              }}
            />
          }
          label={
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}
            >
              Send me occasional WRDLNKDN emails (product updates, events,
              community news). Optional.{' '}
              <Link
                component={RouterLink}
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: '#38bdf8',
                  textDecorationColor: 'rgba(56,189,248,0.4)',
                }}
              >
                Privacy
              </Link>{' '}
              and{' '}
              <Link
                component={RouterLink}
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: '#38bdf8',
                  textDecorationColor: 'rgba(56,189,248,0.4)',
                }}
              >
                Terms
              </Link>
              .
            </Typography>
          }
        />

        {/* Back (left) + Launch (right) */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: 2,
          }}
        >
          <Button
            type="button"
            variant="outlined"
            size="medium"
            onClick={() => handleBack()}
            disabled={submitting}
            sx={{
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.6)',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
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
            ← Back
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => void handleLaunch()}
            disabled={submitting || !displayName.trim()}
            endIcon={
              submitting ? (
                <CircularProgress
                  size={18}
                  sx={{ color: 'rgba(255,255,255,0.7)' }}
                />
              ) : (
                <ArrowForwardIcon />
              )
            }
            sx={{
              py: 1.6,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '0.01em',
              bgcolor: 'transparent',
              border: '1.5px solid rgba(56,189,248,0.55)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 0 20px rgba(56,189,248,0.08)',
              transition: 'all 0.2s ease',
              '&:hover:not(:disabled)': {
                bgcolor: 'rgba(56,189,248,0.1)',
                borderColor: 'rgba(56,189,248,0.8)',
                boxShadow: '0 0 28px rgba(56,189,248,0.2)',
              },
              '&.Mui-disabled': {
                borderColor: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.3)',
              },
            }}
          >
            {submitting ? 'Launching…' : 'Launch your feed'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export { ProfileStep };
export default ProfileStep;
