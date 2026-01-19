import { Button } from '@mui/material';
import { supabase } from '../lib/supabaseClient';

export const LoginButton = () => {
  const signInWithGoogle = async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Google OAuth error:', error.message);
      alert('Login failed. Check console for details.');
    }
  };

  return (
    <Button variant="contained" color="primary" size="large" onClick={signInWithGoogle}>
      Sign in with Google
    </Button>
  );
};