import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { supabase } from '../lib/supabaseClient';

/**
 * Registration request page:
 * - If not signed in: user enters email, gets a magic link
 * - If signed in: user submits profile info -> upsert into profiles (status stays pending)
 *
 * This satisfies:
 * - Users can submit a registration request
 * - Request is approval-gated (status pending by default + admin approves)
 */
export const Register = () => {
  // auth state
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  // profile form
  const [handle, setHandle] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [geekCreds, setGeekCreds] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isAuthed = useMemo(() => !!userId, [userId]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const sendMagicLink = async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const trimmed = email.trim();
      if (!trimmed) throw new Error('Enter an email.');

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          // In dev, Supabase local will still handle this. In prod, set to your domain.
          emailRedirectTo: window.location.origin + '/register',
        },
      });

      if (error) throw error;

      setMsg('Magic link sent. Check your email.');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to send link');
    } finally {
      setLoading(false);
    }
  };

  const submitRegistration = async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      if (!userId) throw new Error('You must be signed in to register.');

      const cleanHandle = handle.trim();
      if (cleanHandle.length < 3) throw new Error('Handle must be 3+ chars.');

      const creds = geekCreds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      /**
       * Upsert profile for this user.
       * - id ties to auth.users (your table references auth.users)
       * - status should remain pending by default (admin changes later)
       */
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        handle: cleanHandle,
        pronouns: pronouns.trim() || null,
        geek_creds: creds.length ? creds : null,
        // nerd_creds + socials can be added later without breaking this flow
      });

      if (error) throw error;

      setMsg('Registration submitted. You are now pending approval.');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      await supabase.auth.signOut();
      setMsg('Signed out.');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Paper
          variant="outlined"
          sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}
        >
          <Stack spacing={2}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Request to join
            </Typography>

            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Submit your profile. You will appear in the directory only after
              approval.
            </Typography>

            {err && <Alert severity="error">{err}</Alert>}
            {msg && <Alert severity="success">{msg}</Alert>}

            {!isAuthed ? (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Step 1: Sign in (magic link)
                </Typography>

                <TextField
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  autoComplete="email"
                />

                <Button
                  variant="contained"
                  onClick={() => void sendMagicLink()}
                  disabled={loading}
                >
                  Send magic link
                </Button>

                <Alert severity="info">
                  After you click the magic link, come back here to finish your
                  registration.
                </Alert>
              </>
            ) : (
              <>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Alert severity="info" sx={{ flexGrow: 1 }}>
                    Signed in. Complete your registration below.
                  </Alert>
                  <Button variant="outlined" onClick={() => void signOut()} disabled={loading}>
                    Sign out
                  </Button>
                </Stack>

                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Step 2: Profile info
                </Typography>

                <TextField
                  label="Handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="raccoonOps"
                  helperText="Required. Must be unique."
                />

                <TextField
                  label="Pronouns"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder="they/them"
                />

                <TextField
                  label="Geek creds (comma separated)"
                  value={geekCreds}
                  onChange={(e) => setGeekCreds(e.target.value)}
                  placeholder="DevOps, Kubernetes, Chaos Engineering"
                />

                <Button
                  variant="contained"
                  onClick={() => void submitRegistration()}
                  disabled={loading}
                >
                  Submit registration
                </Button>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};