// src/pages/Signup.tsx
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

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
  backgroundImage: 'url(/landing-bg.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  overflow: 'hidden',
  '::before': {
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

    const run = async () => {
      try {
        setError(null);
        setChecking(true);

        const { data: sessData, error: sessErr } =
          await supabase.auth.getSession();
        if (sessErr) throw sessErr;

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

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderStep = () => {
    switch (state.currentStep) {
      case 'welcome':
        return <WelcomeStep />;
      case 'identity':
        return <IdentityStep />;
      case 'values':
        return <ValuesStep />;
      case 'profile':
        return <ProfileStep />;
      case 'complete':
        return <CompleteStep />;
      default:
        return <WelcomeStep />;
    }
  };

  const showProgress =
    state.currentStep !== 'welcome' && state.currentStep !== 'complete';

  if (checking) {
    return (
      <Box sx={BG_SX}>
        <Container maxWidth="sm" sx={CARD_SX}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Loading signup…
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={BG_SX}>
      <Container sx={CARD_SX}>
        {showProgress && (
          <Box sx={{ width: '100%', mb: 3 }}>
            <SignupProgress
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
            />
          </Box>
        )}

        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStep()}
      </Container>
    </Box>
  );
};

export default Signup;
