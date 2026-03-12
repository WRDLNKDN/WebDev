import { supabase } from './supabaseClient';

const DEFAULT_SESSION_TIMEOUT_MS = 1200;

export async function getSessionWithTimeout(
  timeoutMs = DEFAULT_SESSION_TIMEOUT_MS,
) {
  return Promise.race([
    supabase.auth.getSession(),
    new Promise<{
      data: { session: null };
      error: Error | null;
    }>((resolve) => {
      window.setTimeout(() => {
        resolve({
          data: { session: null },
          error: new Error('getSession timeout'),
        });
      }, timeoutMs);
    }),
  ]);
}
