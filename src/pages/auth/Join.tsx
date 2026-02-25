// src/pages/Join.tsx
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

import { useJoin } from '../../context/useJoin';
import { supabase } from '../../lib/auth/supabaseClient';

import { IdentityStep } from '../../components/join/IdentityStep';
import { ProfileStep } from '../../components/join/ProfileStep';
import { JoinProgress } from '../../components/join/JoinProgress';
import { ValuesStep } from '../../components/join/ValuesStep';
import { WelcomeStep } from '../../components/join/WelcomeStep';

import { toMessage } from '../../lib/utils/errors';
import { setProfileValidated } from '../../lib/profile/profileValidatedCache';
import { setJoinCompletionFlash } from '../../lib/profile/joinCompletionFlash';

const BG_SX = {
  minHeight: '100dvh',
  position: 'relative' as const,
  display: 'flex',
  justifyContent: 'center',
  alignItems: { xs: 'flex-start', md: 'center' },
  px: { xs: 1.5, sm: 2 },
  py: { xs: 2, sm: 3, md: 6 },
  overflowX: 'hidden',
  overflowY: 'auto',
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

export const Join = () => {
  const navigate = useNavigate();
  const { state, resetSignup, reconcileWithExistingProfile } = useJoin();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setError(null);
        // Retry getSession: after OAuth redirect, session can be briefly unready (Vercel/timing)
        let { data, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        let session: Session | null = data?.session ?? null;
        if (!session) {
          await new Promise((r) => setTimeout(r, 400));
          if (cancelled) return;
          ({ data, error: sessErr } = await supabase.auth.getSession());
          if (sessErr) throw sessErr;
          session = data?.session ?? null;
        }
        if (!session) {
          await new Promise((r) => setTimeout(r, 400));
          if (cancelled) return;
          ({ data } = await supabase.auth.getSession());
          session = data?.session ?? null;
        }

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
              // Cache validated profile so RequireOnboarded doesn't re-fetch (avoids race/loop)
              setProfileValidated(session.user.id, profile);
              navigate('/feed', {
                replace: true,
                state: { profileValidated: profile },
              });
              return;
            }

            reconcileWithExistingProfile(session, profile);
          } else {
            // Session exists but no profile (new user or timing/RLS). Avoid showing Identity again —
            // set identity from session and advance to Values so they don't loop to "Sign in".
            const minimalProfile = {
              display_name: null,
              tagline: null,
              join_reason: [] as string[],
              participation_style: [] as string[],
              additional_context: null,
              policy_version: null,
            };
            reconcileWithExistingProfile(session, minimalProfile);
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

  useEffect(() => {
    if (state.currentStep !== 'complete') return;
    void (async () => {
      try {
        await import('../feed/Feed');
      } catch {
        // Redirect still proceeds if prefetch fails.
      }
      setJoinCompletionFlash();
      navigate(
        { pathname: '/feed', search: '?join=complete' },
        { replace: true },
      );
    })();
  }, [navigate, state.currentStep]);

  const renderStep = () => {
    const steps: Record<string, React.ReactElement> = {
      welcome: <WelcomeStep />,
      identity: <IdentityStep />,
      values: <ValuesStep />,
      profile: <ProfileStep />,
      complete: (
        <Stack
          spacing={2}
          alignItems="center"
          justifyContent="center"
          sx={{ minHeight: 220 }}
        >
          <CircularProgress
            size={24}
            thickness={5}
            aria-label="Finalizing Join"
          />
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            Finalizing your profile and opening your Feed…
          </Typography>
        </Stack>
      ),
    };
    return steps[state.currentStep] || <WelcomeStep />;
  };

  const isFlowActive = !['welcome', 'complete'].includes(state.currentStep);

  if (checking) {
    return (
      <Box sx={BG_SX} data-testid="join-scroll-container">
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
    <Box sx={BG_SX} data-testid="join-scroll-container">
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
            <JoinProgress
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

// Backward-compatible alias during Join naming migration.
export const Signup = Join;
export default Join;
