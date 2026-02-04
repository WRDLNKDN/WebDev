import { Alert, Box, CircularProgress, Container } from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Props = {
  children: React.ReactNode;
};

const BG_SX = {
  minHeight: '100vh',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.12)',
  bgcolor: 'rgba(16, 18, 24, 0.70)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
  p: { xs: 3, sm: 4 },
  color: '#fff',
};

export const AdminGate = ({ children }: Props) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // Not signed in: allow through so AdminApp can show its own sign-in UI
          setIsAdmin(true);
          return;
        }

        const { data, error: rpcError } = (await supabase.rpc('is_admin')) as {
          data: boolean | null;
          error: Error | null;
        };

        if (rpcError) {
          console.error('Admin check error:', rpcError);
          setError('Failed to verify admin access');
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data === true);
      } catch (err) {
        console.error('Admin gate error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    void checkAdmin();
  }, []);

  if (loading) {
    return (
      <Box sx={BG_SX}>
        <Container maxWidth="sm" sx={CARD_SX}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={22} />
            <Box sx={{ opacity: 0.85 }}>Checking admin access…</Box>
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={BG_SX}>
        <Container maxWidth="md" sx={CARD_SX}>
          <Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)' }}>
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box sx={BG_SX}>
        <Container maxWidth="md" sx={CARD_SX}>
          <Alert severity="warning" sx={{ bgcolor: 'rgba(237, 108, 2, 0.1)' }}>
            You do not have admin access. Please contact an administrator if you
            believe this is an error.
          </Alert>
        </Container>
      </Box>
    );
  }

  return <>{children}</>;
};

export default AdminGate;
