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
import { CompleteStep } from '../../components/signup/CompleteStep';

import { toMessage } from '../../lib/utils/errors';
import { showExistingProfileFeedToast } from '../../lib/auth/existingProfileRedirectToast';
import { useAppToast } from '../../context/AppToastContext';
import { setProfileValidated } from '../../lib/profile/profileValidatedCache';
import {
  APP_GLASS_BACKDROP,
  APP_GLASS_BORDER,
  APP_GLASS_SHADOW,
  APP_GLASS_SURFACE,
} from '../../theme/candyStyles';

const JOIN_FIT_PADDING = 8;
const JOIN_MIN_SCALE = 0.72;

/** Fills the layout main region; signup itself should never introduce scrolling. */
const BG_SX = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  maxWidth: '100%',
  overflow: 'hidden',
  overflowX: 'hidden',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative' as const,
  px: { xs: 1, sm: 1.5 },
  py: { xs: 0.5, sm: 1 },
  pb: 'calc(8px + env(safe-area-inset-bottom, 0px))',
  boxSizing: 'border-box' as const,
};

const CARD_SX = {
  position: 'relative',
  width: '100%',
  maxWidth: { xs: '100%', md: 920 },
  borderRadius: 3,
  border: APP_GLASS_BORDER,
  bgcolor: APP_GLASS_SURFACE,
  backdropFilter: APP_GLASS_BACKDROP,
  boxShadow: APP_GLASS_SHADOW,
  p: { xs: 1.25, sm: 1.75, md: 2.5 },
  pb: { xs: 1.5, sm: 2, md: 2.75 },
  color: '#FFFFFF',
  minWidth: 0,
  maxHeight: '100%',
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'hidden',
};

/** 16px inputs on narrow viewports reduce iOS Safari zoom-on-focus. */
const JOIN_CARD_INPUT_MOBILE_SX = {
  '& .MuiInputBase-input': { fontSize: { xs: '1rem' } },
} as const;

export const Join = () => {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const { state, resetSignup, reconcileSessionNoProfile } = useJoin();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardScale, setCardScale] = useState(1);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  // Prevent double scrollbars by making this page own scrolling (same pattern as Layout)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const originalHtmlOverflow = html.style.overflowY;
    const originalBodyOverflow = body.style.overflowY;
    html.style.overflowY = 'hidden';
    body.style.overflowY = 'hidden';
    return () => {
      html.style.overflowY = originalHtmlOverflow;
      body.style.overflowY = originalBodyOverflow;
    };
  }, []);

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
              'display_name, tagline, join_reason, participation_style, additional_context, policy_version, marketing_email_enabled, marketing_opt_in, marketing_source',
            )
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileErr) throw profileErr;

          if (profile) {
            // Any existing profiles row → Feed (no Join wizard / no error).
            resetSignup();
            setProfileValidated(session.user.id, profile);
            showExistingProfileFeedToast(showToast);
            navigate('/feed', {
              replace: true,
              state: { profileValidated: profile },
            });
            return;
          }
          // Session exists but no profile row yet.
          reconcileSessionNoProfile(session);
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
  }, [navigate, resetSignup, reconcileSessionNoProfile, showToast]);

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

  useEffect(() => {
    const viewport = viewportRef.current;
    const card = cardRef.current;
    if (!viewport || !card) return;

    let frameId = 0;
    const scheduleFit = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const availableHeight = Math.max(
          viewport.clientHeight - JOIN_FIT_PADDING * 2,
          1,
        );
        const availableWidth = Math.max(
          viewport.clientWidth - JOIN_FIT_PADDING * 2,
          1,
        );
        const naturalHeight = card.scrollHeight;
        const naturalWidth = card.offsetWidth;

        if (!naturalHeight || !naturalWidth) {
          setCardScale(1);
          return;
        }

        const nextScale = Math.max(
          JOIN_MIN_SCALE,
          Math.min(
            1,
            availableHeight / naturalHeight,
            availableWidth / naturalWidth,
          ),
        );

        setCardScale((prev) =>
          Math.abs(prev - nextScale) < 0.01 ? prev : nextScale,
        );
      });
    };

    scheduleFit();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(scheduleFit)
        : null;

    observer?.observe(viewport);
    observer?.observe(card);
    window.addEventListener('resize', scheduleFit);
    window.addEventListener('orientationchange', scheduleFit);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleFit);
      window.removeEventListener('orientationchange', scheduleFit);
    };
  }, [checking, state.currentStep]);

  const bgSx = {
    ...BG_SX,
    justifyContent: isFlowActive ? 'flex-start' : 'center',
    alignItems: 'center',
    pt: isFlowActive ? { xs: 0.25, sm: 0.5 } : 0,
  };

  if (checking) {
    return (
      <Box
        ref={viewportRef}
        className="app-scroll-container"
        sx={BG_SX}
        data-testid="join-scroll-container"
      >
        <Container
          ref={cardRef}
          maxWidth="sm"
          sx={{
            ...CARD_SX,
            p: 4,
            zIndex: 1,
            transform: `scale(${cardScale})`,
            transformOrigin: 'top center',
            transition: 'transform 160ms ease-out',
            willChange: 'transform',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress
              size={24}
              thickness={5}
              aria-label="Authorization in progress"
            />
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Authorization in Progress
            </Typography>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      ref={viewportRef}
      className="app-scroll-container"
      sx={bgSx}
      data-testid="join-scroll-container"
    >
      <Container
        maxWidth={
          state.currentStep === 'welcome' || state.currentStep === 'complete'
            ? 'sm'
            : state.currentStep === 'profile'
              ? 'lg'
              : 'md'
        }
        sx={[
          CARD_SX,
          JOIN_CARD_INPUT_MOBILE_SX,
          state.currentStep === 'profile'
            ? { maxWidth: { md: 'min(1120px, 100%)' } }
            : {},
          {
            zIndex: 1,
            transition: 'max-width 0.4s ease',
            alignSelf: 'center',
            transform: `scale(${cardScale})`,
            transformOrigin: 'top center',
            willChange: 'transform',
          },
        ]}
        ref={cardRef}
      >
        {isFlowActive && (
          <Box
            sx={{
              mb: { xs: 0.25, sm: 0.75 },
              width: '100%',
              minWidth: 0,
              flexShrink: 0,
            }}
          >
            <JoinProgress
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
            />
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: { xs: 1, sm: 2 }, flexShrink: 0 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Box key={state.currentStep} sx={{ overflow: 'visible' }}>
          {renderStep()}
        </Box>
      </Container>
    </Box>
  );
};

// Backward-compatible alias during Join naming migration.
export const Signup = Join;
export default Join;
