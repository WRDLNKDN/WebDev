import { Button } from '@mui/material';
import { supabase } from '../lib/supabaseClient';

export const LoginButton = () => {
  const signInWithGoogle = async () => {
    const redirectTo = `${window.location.origin}/auth/callback?next=/feed`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      alert('Login failed. Check console for details.');
    }
  };

  return (
    <Button
      variant="contained"
      color="primary"
      size="large"
      onClick={signInWithGoogle}
    >
      Sign in
    </Button>
  );
};
