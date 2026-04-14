/**
 * Lets the notifications list tell the navbar unread hook to re-count immediately,
 * without relying solely on Realtime postgres_changes (which can lag or miss updates).
 */
const EVENT = 'wrdlnkdn:notifications-unread-refresh';

export function requestNotificationsUnreadRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onNotificationsUnreadRefreshRequest(
  handler: () => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const wrapped = () => {
    handler();
  };
  window.addEventListener(EVENT, wrapped);
  return () => window.removeEventListener(EVENT, wrapped);
}
