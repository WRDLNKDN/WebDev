// src/pages/Signup.tsx
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { useSignup } from '../context/useSignup';
import { supabase } from '../lib/supabaseClient';
import { GLASS_CARD, SIGNUP_BG } from '../theme/candyStyles';

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
    const verifySession = async () => {
      try {
        setChecking(true);
        const { data, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;

        if (!cancelled) {
          setChecking(false);
        }
      } catch (e: unknown) {
        // FIXED: Purged 'any' for high-integrity typing
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Verification Failed';
          setError(msg);
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
    // FIXED: Using React.ReactElement to satisfy the compiler's strict audit
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

  // --- RENDER SECTOR: SYSTEM INITIALIZING ---
  if (checking)
    return (
      <Box sx={SIGNUP_BG}>
        <Container maxWidth="sm" sx={{ ...GLASS_CARD, p: 4, zIndex: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} thickness={5} />
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Initializing Human OS Signup...
            </Typography>
          </Stack>
        </Container>
      </Box>
    );

  return (
    <Box sx={SIGNUP_BG}>
      <Container
        maxWidth={state.currentStep === 'profile' ? 'md' : 'sm'}
        sx={{
          ...GLASS_CARD,
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
        {renderStep()}
      </Container>
    </Box>
  );
};

export default Signup;
