/** Payload shape per notification type (for type-safe link handling). */
export type NotificationPayload =
  | { room_id?: string; message_id?: string }
  | { parent_id?: string; reaction_type?: string; reaction_id?: string }
  | { handle?: string }
  | { request_id?: string }
  | { event_id?: string; status?: string };

export type NotificationRowForLink = {
  type: string;
  reference_id: string | null;
  reference_type: string | null;
  payload: NotificationPayload;
  reference_exists?: boolean;
};

/**
 * Returns the route to navigate when clicking a notification.
 * Used by NotificationsPage and unit tests.
 */
export function getNotificationLink(row: NotificationRowForLink): string {
  const safe = row.reference_exists === false;

  if (
    row.type === 'connection_request' ||
    row.type === 'connection_request_accepted' ||
    row.type === 'connection_request_declined'
  ) {
    return '/directory';
  }

  if (row.reference_type === 'feed_item' && row.reference_id && !safe) {
    return `/feed?post=${encodeURIComponent(row.reference_id)}`;
  }
  if (row.reference_type === 'feed_item' && safe) return '/feed';

  if (row.type === 'chat_message') {
    if (row.payload && 'room_id' in row.payload) {
      const roomId = row.payload.room_id;
      if (roomId && !safe) return `/chat/${roomId}`;
    }
    return '/chat';
  }

  if (row.type === 'event_rsvp' && row.reference_id && !safe) {
    return `/events/${row.reference_id}`;
  }
  if (row.type === 'event_rsvp' && safe) return '/events';

  return '/feed';
}
