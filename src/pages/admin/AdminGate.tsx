import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Container } from '@mui/material';
import { supabase } from '../../lib/supabaseClient';

type Props = {
  children: React.ReactNode;
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
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data, error: rpcError } = await supabase.rpc('is_admin');

        if (rpcError) {
          console.error('Admin check error:', rpcError);
          setError('Failed to verify admin access');
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (err) {
        console.error('Admin gate error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          You do not have admin access. Please contact an administrator if you
          believe this is an error.
        </Alert>
      </Container>
    );
  }

  return <>{children}</>;
};

export default AdminGate;
