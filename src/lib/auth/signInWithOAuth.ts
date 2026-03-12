/**
 * OAuth sign-in with provider-specific options.
 * Azure requires explicit scopes for email, profile, and refresh tokens.
 */
import { supabase } from './supabaseClient';

export type OAuthProvider = 'google' | 'azure';

const OAUTH_START_TIMEOUT_MS = 12_000;

export async function signInWithOAuth(
  provider: OAuthProvider,
  options: { redirectTo: string; timeoutMs?: number },
) {
  const { redirectTo, timeoutMs = OAUTH_START_TIMEOUT_MS } = options;

  return Promise.race([
    supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        ...(provider === 'azure' && {
          scopes: 'email profile offline_access',
        }),
      },
    }),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error('OAuth start timeout: provider redirect took too long'),
        );
      }, timeoutMs);
    }),
  ]);
}
