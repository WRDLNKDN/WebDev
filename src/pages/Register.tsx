// src/pages/Register.tsx
//
// Registration request flow:
// 1) User signs in (Supabase Auth)
// 2) User submits profile fields
// 3) We upsert into public.profiles with status='pending'
//
// RLS allows the signed-in user to insert/update only their own profile row.
// Status changes are blocked by your trigger unless service_role.

import { useEffect, useState } from 'react';
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

export const Register = () => {
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // auth form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // profile form
  const [handle, setHandle] = useState('');
  const [pronouns, setPronouns] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = async () => {
    const { data } = await supabase.auth.getSession();
    setSessionEmail(data.session?.user?.email ?? null);
  };

  useEffect(() => {
    void refreshSession();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authErr) throw authErr;
      setMessage('Signed in. Now submit your profile request.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (authErr) throw authErr;
      setMessage('Account created. You can sign in now.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const submitProfile = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setError('You must be signed in to submit a registration request.');
        return;
      }

      const cleanHandle = handle.trim();
      if (cleanHandle.length < 3) {
        setError('Handle must be at least 3 characters.');
        return;
      }

      // Upsert is handy for “edit my request” behavior.
      // Your RLS + grants allow the user to write their own row only.
      const { error: upsertErr } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          handle: cleanHandle,
          pronouns: pronouns.trim() || null,
          // status defaults to pending (and users can't change it anyway)
        },
        { onConflict: 'id' },
      );

      if (upsertErr) throw upsertErr;

      setMessage(
        'Registration request submitted. You will appear in the directory after approval.',
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    setMessage(null);
    await supabase.auth.signOut();
  };

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Request membership
            </Typography>

            {message && <Alert severity="success">{message}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}

            {!sessionEmail ? (
              <>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Sign in (or create an account) to submit your registration.
                </Typography>

                <TextField
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    onClick={() => void signIn()}
                    disabled={loading}
                  >
                    Sign in
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => void signUp()}
                    disabled={loading}
                  >
                    Create account
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <Alert severity="info">
                  Signed in as <strong>{sessionEmail}</strong>
                </Alert>

                <TextField
                  label="Handle"
                  helperText="Public username (min 3 chars)."
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
                <TextField
                  label="Pronouns (optional)"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                />

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    onClick={() => void submitProfile()}
                    disabled={loading}
                  >
                    Submit request
                  </Button>
                  <Button variant="outlined" onClick={() => void signOut()}>
                    Sign out
                  </Button>
                </Stack>

                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Your profile will be pending until an admin approves it.
                </Typography>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};