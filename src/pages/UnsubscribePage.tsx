import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

/**
 * One-click unsubscribe page.
 * - Authenticated: can unsubscribe directly
 * - With ?token=...: for email links (backend would verify token)
 * - Otherwise: directs to sign in and Settings
 */
export const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  );
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setSignedIn(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleUnsubscribe = useCallback(async () => {
    setStatus('loading');
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        setStatus('error');
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({ marketing_opt_in: false })
        .eq('id', session.session.user.id);
      if (error) throw error;
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, []);

  // TODO: If token present, call backend /api/unsubscribe?token=... to verify and unsubscribe
  if (token) {
    return (
      <Box sx={{ py: 6 }}>
        <Container maxWidth="sm">
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Unsubscribe
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Token-based unsubscribe is not yet implemented. Please sign in and
              use Settings → Email preferences to manage your subscriptions.
            </Typography>
            <Button component={RouterLink} to="/" variant="contained">
              Go to Home
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (signedIn === null) {
    return (
      <Box sx={{ py: 6 }}>
        <Container maxWidth="sm">
          <Typography color="text.secondary">Loading…</Typography>
        </Container>
      </Box>
    );
  }

  if (!signedIn) {
    return (
      <Box sx={{ py: 6 }}>
        <Container maxWidth="sm">
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Email preferences
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sign in to manage your email preferences, or use the unsubscribe
              link in our emails for one-click opt-out.
            </Typography>
            <Button component={RouterLink} to="/" variant="contained">
              Sign in
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Unsubscribe from marketing emails
          </Typography>
          {status === 'idle' && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Stop receiving marketing and newsletter emails. You can change
                this anytime in Settings.
              </Typography>
              <Button
                variant="contained"
                color="warning"
                onClick={() => void handleUnsubscribe()}
              >
                Unsubscribe
              </Button>
            </>
          )}
          {status === 'loading' && (
            <Typography color="text.secondary">Updating…</Typography>
          )}
          {status === 'done' && (
            <>
              <Typography color="success.main" sx={{ mb: 2 }}>
                You&apos;ve been unsubscribed. You won&apos;t receive marketing
                emails going forward.
              </Typography>
              <Button component={RouterLink} to="/dashboard" variant="outlined">
                Back to Dashboard
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <Typography color="error" sx={{ mb: 2 }}>
                Something went wrong. Please try again or update your
                preferences in Settings.
              </Typography>
              <Button component={RouterLink} to="/dashboard">
                Go to Dashboard
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};
