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

import type { Session } from '@supabase/supabase-js';

import { useSignup } from '../context/useSignup';
import { supabase } from '../lib/supabaseClient';

import { CompleteStep } from '../components/signup/CompleteStep';
import { IdentityStep } from '../components/signup/IdentityStep';
import { ProfileStep } from '../components/signup/ProfileStep';
import { SignupProgress } from '../components/signup/SignupProgress';
import { ValuesStep } from '../components/signup/ValuesStep';
import { WelcomeStep } from '../components/signup/WelcomeStep';

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Signup failed';
};

const BG_SX = {
  minHeight: '100vh',
  position: 'relative',
  display: 'grid',
  placeItems: 'center',
  px: 2,
  py: 6,
  backgroundColor: '#05070f',
  backgroundImage: 'url(/assets/landing-bg.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 50% 30%, rgba(0,0,0,0.35), rgba(0,0,0,0.85))',
  },
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
  p: { xs: 3, sm: 4 },
  color: '#fff',
};

export const Signup = () => {
  const { state } = useSignup();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        setError(null);
        setChecking(true);

        const { data, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;

        // Type integrity: use typed session so IdP/session shape is not bypassed
        const session: Session | null = data?.session ?? null;
        if (session && !cancelled) {
          // Already authenticated; wizard will show current step from context
        }
        if (!cancelled) {
          setChecking(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(toMessage(e));
          setChecking(false);
        }
      }
    };

    void verifySession();
    return () => {
      cancelled = true;
    };
  }, []);

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
              Loading signup…
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
          p: { xs: 3, md: 5 },
          zIndex: 1,
          transition: 'max-width 0.4s ease',
        }}
      >
        {isFlowActive && (
          <Box sx={{ mb: 4 }}>
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
