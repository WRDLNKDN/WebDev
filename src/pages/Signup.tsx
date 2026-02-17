// src/pages/Signup.tsx
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

import type { Session } from '@supabase/supabase-js';

import { useSignup } from '../context/useSignup';
import { supabase } from '../lib/supabaseClient';

import { CompleteStep } from '../components/signup/CompleteStep';
import { IdentityStep } from '../components/signup/IdentityStep';
import { ProfileStep } from '../components/signup/ProfileStep';
import { SignupProgress } from '../components/signup/SignupProgress';
import { ValuesStep } from '../components/signup/ValuesStep';
import { WelcomeStep } from '../components/signup/WelcomeStep';

import { toMessage } from '../lib/errors';

const BG_SX = {
  minHeight: '100vh',
  position: 'relative' as const,
  display: 'grid',
  placeItems: 'center',
  px: { xs: 1.5, sm: 2 },
  py: 6,
  overflow: 'hidden',
};

const CARD_SX = {
  position: 'relative',
  width: '100%',
  maxWidth: 920,
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.12)',
  bgcolor: 'rgba(16, 18, 24, 0.70)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
  p: { xs: 2, sm: 3, md: 5 },
  color: '#fff',
  minWidth: 0,
  overflow: 'hidden',
};

export const Signup = () => {
  const navigate = useNavigate();
  const { state, resetSignup, reconcileWithExistingProfile } = useSignup();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setError(null);
        const { data, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        const session: Session | null = data?.session ?? null;

        if (session && !cancelled) {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select(
              'display_name, tagline, join_reason, participation_style, additional_context, policy_version, marketing_opt_in, marketing_source',
            )
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileErr) throw profileErr;

          if (profile) {
            const hasPolicyVersion = Boolean(profile.policy_version);
            const hasValues =
              (profile.join_reason?.length ?? 0) > 0 &&
              (profile.participation_style?.length ?? 0) > 0;
            const hasDisplayName = Boolean(profile.display_name?.trim());

            if (hasPolicyVersion && hasValues && hasDisplayName) {
              resetSignup();
              navigate('/feed', { replace: true });
              return;
            }

            reconcileWithExistingProfile(session, profile);
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setError(toMessage(e));
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [navigate, resetSignup, reconcileWithExistingProfile]);

  const renderStep = () => {
    const steps: Record<string, React.ReactElement> = {
      welcome: <WelcomeStep />,
      identity: <IdentityStep />,
      values: <ValuesStep />,
      profile: <ProfileStep />,
      complete: <CompleteStep />,
    };
    return steps[state.currentStep] || <WelcomeStep />;
  };

  const isFlowActive = !['welcome', 'complete'].includes(state.currentStep);

  if (checking) {
    return (
      <Box sx={BG_SX}>
        <Container maxWidth="sm" sx={{ ...CARD_SX, p: 4, zIndex: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} thickness={5} aria-label="Loading" />
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Loading…
            </Typography>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={BG_SX}>
      <Container
        maxWidth={
          state.currentStep === 'welcome' || state.currentStep === 'complete'
            ? 'sm'
            : 'md'
        }
        sx={{
          ...CARD_SX,
          zIndex: 1,
          transition: 'max-width 0.4s ease',
        }}
      >
        {isFlowActive && (
          <Box sx={{ mb: 3, width: '100%', minWidth: 0 }}>
            <SignupProgress
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
            />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {renderStep()}
      </Container>
    </Box>
  );
};

export default Signup;
