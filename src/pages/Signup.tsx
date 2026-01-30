// src/pages/Signup.tsx
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { useSignup } from '../context/useSignup';
import { supabase } from '../lib/supabaseClient';

import { SignupProgress } from '../components/signup/SignupProgress';
import { WelcomeStep } from '../components/signup/WelcomeStep';
import { IdentityStep } from '../components/signup/IdentityStep';
import { ValuesStep } from '../components/signup/ValuesStep';
import { ProfileStep } from '../components/signup/ProfileStep';
import { CompleteStep } from '../components/signup/CompleteStep';

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
  const navigate = useNavigate();
  const { state } = useSignup();

  const [checking, setChecking] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
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

        const session = sessData.session;

        if (!session) {
          if (!cancelled) {
            setNeedsAuth(true);
            setChecking(false);
          }
          return;
        }

        // User is authenticated, let them proceed with signup
        if (!cancelled) {
          setNeedsAuth(false);
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

  const signIn = async () => {
    setError(null);

    try {
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
        '/signup',
      )}`;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (signInError) throw signInError;
    } catch (e: unknown) {
      setError(toMessage(e));
    }
  };

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

  if (needsAuth) {
    return (
      <Box sx={BG_SX}>
        <Container maxWidth="sm" sx={CARD_SX}>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
            Create your WRDLNKDN profile
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
            Continue with Google to request a profile.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={() => void signIn()}
          >
            Continue with Google
          </Button>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="text"
              onClick={() => navigate('/', { replace: true })}
            >
              Back home
            </Button>
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
