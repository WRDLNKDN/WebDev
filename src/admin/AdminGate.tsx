import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { supabase } from '../lib/supabaseClient';

export const AdminGate = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setReason('');

      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          if (!mounted) return;
          setAllowed(false);
          setReason('You must sign in to access admin tools.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.rpc('is_admin');

        if (!mounted) return;

        if (error) {
          setAllowed(false);
          setReason(`Admin check failed: ${error.message}`);
          setLoading(false);
          return;
        }

        setAllowed(Boolean(data));
        if (!data) setReason('Not allowlisted for admin.');
        setLoading(false);
      } catch (e: unknown) {
        if (!mounted) return;
        const msg = e instanceof Error ? e.message : 'Admin check failed.';
        setAllowed(false);
        setReason(msg);
        setLoading(false);
      }
    };

    void run();

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
        Admin access denied. {reason}
      </Alert>
    );
  }

  return <>{children}</>;
};
