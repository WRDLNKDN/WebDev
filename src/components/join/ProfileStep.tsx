import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJoin } from '../../context/useJoin';
import {
  FORM_OUTLINED_FIELD_SX,
  FORM_SECTION_HEADING_SX,
  FORM_SECTION_PANEL_SX,
} from '../../lib/ui/formSurface';
import { setJoinCompletionFlash } from '../../lib/profile/joinCompletionFlash';
import { setProfileValidated } from '../../lib/profile/profileValidatedCache';
import { POLICY_VERSION } from '../../types/join';
import { JoinInterestsSelector } from './profile/JoinInterestsSelector';
import { ProfileStepHero } from './profile/ProfileStepHero';
import { ProfileStepMarketingOptIn } from './profile/ProfileStepMarketingOptIn';
import { ProfileStepPreviewCard } from './profile/ProfileStepPreviewCard';

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
  const [interests, setInterests] = useState<string[]>(
    state.profile?.interests ?? [],
  );
  const [interestsError, setInterestsError] = useState<string | null>(null);
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

    const profileData = {
      displayName: displayName.trim(),
      marketingOptIn,
      interests: interests.slice(0, 8),
    };
    setProfile(profileData);

    try {
      const result = await submitRegistration(profileData);
      if (result !== 'submitted') return;
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
    setProfile({
      displayName: displayName.trim(),
      marketingOptIn,
      interests: interests.slice(0, 8),
    });
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
        <ProfileStepHero />
        <Box sx={{ ...FORM_SECTION_PANEL_SX, width: '100%' }}>
          <Typography
            variant="caption"
            sx={{ ...FORM_SECTION_HEADING_SX, display: 'block', mb: 0.75 }}
          >
            Profile Basics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set the name members will see across your profile, directory, and
            feed.
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
        <Box sx={{ ...FORM_SECTION_PANEL_SX, width: '100%' }}>
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
            sx={FORM_OUTLINED_FIELD_SX}
          />
        </Box>

        {/* Interests */}
        <Box sx={{ ...FORM_SECTION_PANEL_SX, width: '100%' }}>
          <JoinInterestsSelector
            value={interests}
            onChange={(next) => {
              setInterestsError(null);
              setInterests(next);
            }}
            disabled={submitting}
            error={interestsError ?? undefined}
            onValidationError={(msg) => setInterestsError(msg || null)}
          />
        </Box>

        <Box sx={{ ...FORM_SECTION_PANEL_SX, width: '100%' }}>
          <ProfileStepPreviewCard previewName={previewName} />
        </Box>

        <Box sx={{ ...FORM_SECTION_PANEL_SX, width: '100%' }}>
          <ProfileStepMarketingOptIn
            checked={marketingOptIn}
            disabled={submitting}
            onChange={(checked) => {
              setMarketingOptIn(checked);
              setLocalError(null);
            }}
          />
        </Box>

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
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.85)',
                bgcolor: 'rgba(156,187,217,0.18)',
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
              color: '#FFFFFF',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 0 20px rgba(56,189,248,0.08)',
              transition: 'all 0.2s ease',
              '&:hover:not(:disabled)': {
                bgcolor: 'rgba(56,189,248,0.1)',
                borderColor: 'rgba(56,189,248,0.8)',
                boxShadow: '0 0 28px rgba(56,189,248,0.2)',
              },
              '&.Mui-disabled': {
                borderColor: 'rgba(156,187,217,0.26)',
                color: 'rgba(141,188,229,0.50)',
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
