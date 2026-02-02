// src/pages/Signup.tsx
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Container,
    FormControlLabel,
    Stack,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const { state } = useSignup();

  const [checking, setChecking] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<
    'google' | 'azure' | null
  >(null);

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

  const signIn = async (provider: 'google' | 'azure') => {
    setError(null);
    setLoadingProvider(provider);

    try {
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
        '/signup',
      )}`;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (signInError) throw signInError;
    } catch (e: unknown) {
      setLoadingProvider(null);
      const msg = toMessage(e);
      if (
        typeof msg === 'string' &&
        msg.toLowerCase().includes('provider') &&
        msg.toLowerCase().includes('not enabled')
      ) {
        setError(
          'Microsoft sign-in is not configured. Add SUPABASE_AZURE_CLIENT_ID and SUPABASE_AZURE_CLIENT_SECRET to your .env, then run: supabase stop && supabase start. See supabase/README.md.',
        );
      } else {
        setError(msg);
      }
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

  const gateCanProceed = termsAccepted && guidelinesAccepted;

  if (needsAuth) {
    return (
      <Box sx={BG_SX}>
        <Container maxWidth="sm" sx={CARD_SX}>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
            Create your WRDLNKDN profile
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
            Sign in with your preferred identity provider. We never store
            passwords.
          </Typography>

          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, mb: 1.5, display: 'block' }}
          >
            Before continuing, please accept:
          </Typography>
          <Stack spacing={2} sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  sx={{ color: 'rgba(255,255,255,0.7)' }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  I accept the{' '}
                  <Box
                    component="a"
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: '#90caf9',
                      textDecoration: 'underline',
                    }}
                  >
                    Terms of Service
                  </Box>
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={guidelinesAccepted}
                  onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                  sx={{ color: 'rgba(255,255,255,0.7)' }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  I accept the{' '}
                  <Box
                    component="a"
                    href="/guidelines"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: '#90caf9',
                      textDecoration: 'underline',
                    }}
                  >
                    Community Guidelines
                  </Box>
                </Typography>
              }
            />
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => void signIn('google')}
              disabled={!gateCanProceed || !!loadingProvider}
              startIcon={
                loadingProvider === 'google' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <GoogleIcon />
                )
              }
              fullWidth
              sx={{
                borderColor: 'rgba(66, 133, 244, 0.6)',
                color: '#4285f4',
                '&:hover': {
                  borderColor: '#4285f4',
                  bgcolor: 'rgba(66, 133, 244, 0.12)',
                },
              }}
            >
              Continue with Google
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => void signIn('azure')}
              disabled={!gateCanProceed || !!loadingProvider}
              startIcon={
                loadingProvider === 'azure' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <MicrosoftIcon />
                )
              }
              fullWidth
              sx={{
                borderColor: 'rgba(0, 120, 212, 0.6)',
                color: '#0078d4',
                '&:hover': {
                  borderColor: '#0078d4',
                  bgcolor: 'rgba(0, 120, 212, 0.12)',
                },
              }}
            >
              Continue with Microsoft
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/', { replace: true })}
              sx={{
                borderColor: 'rgba(255,255,255,0.4)',
                color: 'rgba(255,255,255,0.9)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.7)',
                  bgcolor: 'rgba(255,255,255,0.08)',
                },
              }}
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
