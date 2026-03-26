import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJoin } from '../../context/useJoin';
import {
  FORM_SECTION_PANEL_SX,
  outlinedFieldSxFromTheme,
} from '../../lib/ui/formSurface';
import { setJoinCompletionFlash } from '../../lib/profile/joinCompletionFlash';
import { setProfileValidated } from '../../lib/profile/profileValidatedCache';
import { INTERESTS_MAX } from '../../constants/interestTaxonomy';
import {
  joinFlowPrimaryButtonSx,
  joinFlowSecondaryButtonSx,
} from '../../theme/joinStyles';
import { BRAND_COLORS } from '../../theme/themeConstants';
import { POLICY_VERSION } from '../../types/join';
import { JoinInterestsSelector } from './profile/JoinInterestsSelector';
import { ProfileStepHero } from './profile/ProfileStepHero';
import { ProfileStepMarketingOptIn } from './profile/ProfileStepMarketingOptIn';
import { ProfileStepPreviewCard } from './profile/ProfileStepPreviewCard';

const ProfileStep = () => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
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
      interests: interests.slice(0, INTERESTS_MAX),
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
      interests: interests.slice(0, INTERESTS_MAX),
    });
    goToStep('values');
  };

  const previewName = displayName.trim() || 'Your Name';

  const panelPad = { xs: 0.5, sm: 1, md: 1.2 } as const;

  const panelWrapSx = {
    ...FORM_SECTION_PANEL_SX,
    width: '100%',
    p: panelPad,
  } as const;

  const profileFinalSectionSx = {
    width: '100%',
    mt: { xs: 0, sm: 0.5 },
    pt: { xs: 1, sm: 2 },
    borderTop: '1px solid rgba(156,187,217,0.16)',
  } as const;

  const actionRowSx = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: { xs: 1, sm: 2 },
    flexShrink: 0,
    pt: { xs: 0.25, sm: 0.75 },
  } as const;

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        px: { xs: 0.5, sm: 1.5 },
        py: { xs: 0, sm: 0.75, md: 1 },
      }}
    >
      <Stack
        spacing={{ xs: 0.5, sm: 0.75, md: 1 }}
        sx={{ width: '100%', maxWidth: { xs: 520, md: '100%' }, mx: 'auto' }}
      >
        <ProfileStepHero compact />

        <Stack spacing={{ xs: 0.65, sm: 1, md: 1.15 }}>
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

          <Box sx={panelWrapSx}>
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
                ...outlinedFieldSxFromTheme(theme),
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: BRAND_COLORS.purple,
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: BRAND_COLORS.purple,
                },
              }}
            />
          </Box>

          <Box sx={panelWrapSx}>
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

          <Box sx={profileFinalSectionSx}>
            <Stack spacing={{ xs: 1.15, sm: 2 }}>
              <Box sx={panelWrapSx}>
                <ProfileStepPreviewCard
                  previewName={previewName}
                  compact={!isSmUp}
                />
              </Box>

              <ProfileStepMarketingOptIn
                checked={marketingOptIn}
                disabled={submitting}
                onChange={(checked) => {
                  setMarketingOptIn(checked);
                  setLocalError(null);
                }}
              />

              <Box sx={actionRowSx}>
                <Button
                  type="button"
                  variant="contained"
                  size="medium"
                  disableElevation
                  onClick={() => handleBack()}
                  disabled={submitting}
                  sx={{
                    ...joinFlowSecondaryButtonSx,
                    flexShrink: 0,
                  }}
                >
                  ← Back
                </Button>
                <Button
                  variant="contained"
                  size="medium"
                  onClick={() => void handleLaunch()}
                  disableElevation
                  disabled={submitting || !displayName.trim()}
                  endIcon={
                    submitting ? (
                      <CircularProgress
                        size={18}
                        sx={{ color: 'rgba(255,255,255,0.85)' }}
                      />
                    ) : (
                      <ArrowForwardIcon />
                    )
                  }
                  sx={{
                    ...joinFlowPrimaryButtonSx,
                    flex: { xs: '1 1 auto', sm: '0 1 auto' },
                  }}
                >
                  {submitting ? 'Launching…' : 'Launch your feed'}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
};

export { ProfileStep };
export default ProfileStep;
