/**
 * Updates profiles.last_active_at for "Recently Active" sort in Directory.
 * Throttled to once per 5 minutes per tab (sessionStorage).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const THROTTLE_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'last_active_updated';

export async function updateLastActive(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  const last = raw ? parseInt(raw, 10) : 0;
  if (Date.now() - last < THROTTLE_MS) return;

  const { error } = await supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);

  if (!error) sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
}
