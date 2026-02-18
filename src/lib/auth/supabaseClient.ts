// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const appEnv = (import.meta.env.VITE_APP_ENV as string | undefined)
  ?.trim()
  .toLowerCase();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars');
}

// Env-prefixed keys so UAT and PROD sessions don't collide (prevents 401s)
const envPrefix =
  appEnv === 'uat'
    ? 'uat-'
    : appEnv === 'production' || appEnv === 'prod'
      ? 'prod-'
      : 'dev-';
export const AUTH_STORAGE_KEY = `${envPrefix}sb-wrdlnkdn-auth`;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: AUTH_STORAGE_KEY,
    storage: window.localStorage,
  },
});
