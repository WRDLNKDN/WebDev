import { supabase } from '../auth/supabaseClient';

export type MarkNotificationReadResult =
  | { ok: true; readAt: string }
  | { ok: false; message: string };

/**
 * Sets read_at for a single notification row (shared by mark-as-read and dismiss).
 */
export async function markNotificationRowReadAt(
  notificationId: string,
): Promise<MarkNotificationReadResult> {
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: readAt })
    .eq('id', notificationId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, readAt };
}
