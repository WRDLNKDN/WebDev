/**
 * OAuth sign-in with provider-specific options.
 * Azure requires explicit scopes for email, profile, and refresh tokens.
 */
import { supabase } from './supabaseClient';

export type OAuthProvider = 'google' | 'azure';

export async function signInWithOAuth(
  provider: OAuthProvider,
  options: { redirectTo: string },
) {
  const { redirectTo } = options;

  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      ...(provider === 'azure' && {
        scopes: 'email profile offline_access',
      }),
    },
  });
}
