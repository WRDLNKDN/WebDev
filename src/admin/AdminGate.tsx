import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { supabase } from '@/lib/supabaseClient';

export const AdminGate = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setReason('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user?.email) {
        setAllowed(false);
        setReason('Not signed in.');
        setEmail(null);
        setLoading(false);
        return;
      }

      setEmail(user.email);

      try {
        const { data, error } = await supabase.rpc('is_admin');

        if (!mounted) return;

        if (error) {
          setAllowed(false);
          setReason(error.message);
        } else if (data === true) {
          setAllowed(true);
          setReason('');
        } else {
          setAllowed(false);
          setReason('Account is not in the admin allowlist.');
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Admin check failed.';
        setAllowed(false);
        setReason(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!allowed) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        <Typography variant="subtitle2">Admin access denied</Typography>
        {email && (
          <Typography variant="body2">
            Signed in as <strong>{email}</strong>
          </Typography>
        )}
        <Typography variant="body2">{reason}</Typography>
      </Alert>
    );
  }

  return <>{children}</>;
};
