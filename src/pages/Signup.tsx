import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignup } from '../context/useSignup';
import { supabase } from '../lib/supabaseClient';
import { GLASS_CARD, SIGNUP_BG } from '../theme/candyStyles';

// COMPONENT SECTOR
import { CompleteStep } from '../components/signup/CompleteStep';
import { IdentityStep } from '../components/signup/IdentityStep';
import { ProfileStep } from '../components/signup/ProfileStep';
import { SignupProgress } from '../components/signup/SignupProgress';
import { ValuesStep } from '../components/signup/ValuesStep';
import { WelcomeStep } from '../components/signup/WelcomeStep';

export const Signup = () => {
  const navigate = useNavigate();
  const { state } = useSignup();
  const [checking, setChecking] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const verifySession = async () => {
      try {
        setChecking(true);
        const { data, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        if (!cancelled) {
          setNeedsAuth(!data.session);
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

  const handleOAuth = async () => {
    // High-Integrity Handshake: Ensure the user returns to the signup flow after auth
    const redirectTo = `${window.location.origin}/auth/callback?next=/signup`;
    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (authErr) setError(authErr.message);
  };

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

  // --- RENDER SECTOR: AUTHENTICATION REQUIRED ---
  if (needsAuth)
    return (
      <Box sx={SIGNUP_BG}>
        <Container
          maxWidth="sm"
          sx={{ ...GLASS_CARD, p: { xs: 4, md: 6 }, zIndex: 1 }}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: 900, mb: 1, letterSpacing: -1 }}
          >
            Begin Verification
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.7, mb: 4 }}>
            Connect your Google identity to scaffold your WRDLNKDN profile.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={() => void handleOAuth()}
              sx={{ py: 1.5, fontSize: '1.1rem' }}
            >
              Continue with Google
            </Button>
            <Button
              variant="text"
              onClick={() => navigate('/')}
              sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'none' }}
            >
              Abort Protocol
            </Button>
          </Stack>
        </Container>
      </Box>
    );

  // --- RENDER SECTOR: ACTIVE FLOW ---
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
