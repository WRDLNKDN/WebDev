/**
 * Supabase JS uses an internal async lock around auth storage (keyed per `storageKey`).
 * Concurrent getSession / refreshSession / setSession can throw instead of queueing.
 * These errors are implementation noise and must not surface on public surfaces (e.g. Home).
 */
export function isBenignSupabaseAuthLockContentionError(
  error: unknown,
): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (!raw) return false;
  return (
    /Lock\s+"lock:/i.test(raw) &&
    /was released because another request stole it/i.test(raw)
  );
}
