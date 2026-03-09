// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const appEnv = (import.meta.env.VITE_APP_ENV as string | undefined)
  ?.trim()
  .toLowerCase();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars');
}
if (import.meta.env.DEV) {
  const port = (() => {
    const m = supabaseUrl.match(/:(\d+)(?:\/|$)/);
    return m ? m[1] : null;
  })();
  if (port === '5173') {
    console.warn(
      '[Supabase] VITE_SUPABASE_URL points at the Vite dev server (port 5173). Use your Supabase API URL instead (e.g. http://localhost:54321). Check .env.',
    );
  } else if (port && port !== '54321') {
    console.warn(
      `[Supabase] VITE_SUPABASE_URL uses port ${port}. For local dev, Supabase usually runs on 54321. If things fail, set VITE_SUPABASE_URL=http://localhost:54321 in .env and run "supabase start".`,
    );
  }
}

// Env-prefixed keys so UAT and PROD sessions don't collide (prevents 401s)
const envPrefix =
  appEnv === 'uat'
    ? 'uat-'
    : appEnv === 'production' || appEnv === 'prod'
      ? 'prod-'
      : 'dev-';
export const AUTH_STORAGE_KEY = `${envPrefix}sb-wrdlnkdn-auth`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: AUTH_STORAGE_KEY,
    storage: window.localStorage,
  },
});
