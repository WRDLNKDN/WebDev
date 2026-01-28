// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { authDebug } from './authDebug';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// 🔴 THIS IS CRITICAL LOGGING 🔴
supabase.auth.onAuthStateChange((event, session) => {
  authDebug('onAuthStateChange', {
    event,
    session: session
      ? {
          userId: session.user.id,
          email: session.user.email,
          expires_at: session.expires_at,
        }
      : null,
  });
});
