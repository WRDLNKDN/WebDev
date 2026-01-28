// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { authDebug } from './authDebug';

// IMPORTANT: Vite env vars must be prefixed with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // This is intentionally loud because missing env will cause confusing auth loops.
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,

    // Make session storage predictable so logout/debug is consistent
    storageKey: 'wrdlnkdn-auth',
  },
});

// Lightweight auth tracing
supabase.auth.onAuthStateChange((event, session) => {
  authDebug('log', `onAuthStateChange: ${event}`, {
    hasSession: Boolean(session),
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
    expiresAt: session?.expires_at ?? null,
  });
});
