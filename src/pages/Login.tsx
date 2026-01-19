import { Button, Container, Typography, Stack } from '@mui/material';
import { supabase } from '../lib/supabaseClient';

export const Login = () => {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>
        Sign in
      </Typography>

      <Stack spacing={2}>
        <Button variant="contained" onClick={signInWithGoogle}>
          Sign in with Google
        </Button>
      </Stack>
    </Container>
  );
};
