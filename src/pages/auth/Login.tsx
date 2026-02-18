import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { GLASS_CARD, SIGNUP_BG } from '../../theme/candyStyles';

export const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- LOGIC SECTOR: AUTHENTICATION PROTOCOL ---
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const origin = window.location.origin;
      // High-Integrity Redirect: Ensure the Human OS returns to the Feed
      const redirectTo = `${origin}/auth/callback?next=/feed`;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (signInError) throw signInError;
    } catch (e: unknown) {
      setError(toMessage(e));
      setLoading(false);
    }
  };

  return (
    <Box sx={SIGNUP_BG}>
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            ...GLASS_CARD,
            p: { xs: 4, md: 6 },
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <Stack spacing={4}>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  letterSpacing: -1,
                  mb: 1,
                  background: 'linear-gradient(45deg, #fff 30%, #42a5f5 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Access Terminal
              </Typography>
              <Typography
                variant="body1"
                sx={{ opacity: 0.7, fontWeight: 300 }}
              >
                Authorized Personnel Only. <br />
                Please verify your **Human OS** via Google.
              </Typography>
            </Box>

            {error && (
              <Alert
                severity="error"
                variant="filled"
                sx={{ borderRadius: 2, bgcolor: 'rgba(211, 47, 47, 0.8)' }}
              >
                {error}
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              disabled={loading}
              onClick={() => void handleGoogleSignIn()}
              sx={{
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: '0 4px 20px rgba(66, 165, 245, 0.4)',
                '&:hover': {
                  boxShadow: '0 6px 25px rgba(66, 165, 245, 0.6)',
                },
              }}
            >
              {loading ? 'Verifying...' : 'Initialize Session'}
            </Button>

            <Button
              variant="text"
              onClick={() => navigate('/')}
              sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'none' }}
            >
              Abort Entry & Return Home
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
