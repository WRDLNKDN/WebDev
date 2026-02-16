import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

/**
 * Route guard: redirects to /join when user is not signed in.
 * Use for Feed and other auth-required routes.
 */
export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [session, setSession] = useState<
    { user: { id: string } } | null | 'loading'
  >('loading');

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled)
        setSession(
          data.session ? { user: { id: data.session.user.id } } : null,
        );
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      if (!cancelled) {
        setSession(newSession ? { user: { id: newSession.user.id } } : null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (session === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '40vh',
        }}
      >
        <CircularProgress aria-label="Checking authentication" />
      </Box>
    );
  }

  if (!session) {
    return <Navigate to="/join" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
