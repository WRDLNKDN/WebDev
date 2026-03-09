import type { NotificationPayload } from '../../lib/notifications/notificationLinks';
import { supabase } from '../../lib/auth/supabaseClient';
import type { NotificationRow } from './notificationsPageUi';

const POST_PREVIEW_MAX_LENGTH = 180;
const POST_RELATED_TYPES = new Set([
  'comment',
  'reaction',
  'mention',
  'repost',
]);

type ActorProfile = {
  handle: string | null;
  display_name: string | null;
  avatar: string | null;
};

const unique = <T>(values: T[]) => [...new Set(values)];

const asArray = <T>(value: T[] | null | undefined): T[] => value ?? [];

const collectIds = (
  rows: NotificationRow[],
  predicate: (row: NotificationRow) => boolean,
) =>
  unique(
    rows
      .filter(predicate)
      .map((row) => row.reference_id)
      .filter((id): id is string => id != null),
  );

const collectChatRoomIds = (rows: NotificationRow[]) =>
  unique(
    rows
      .filter(
        (row) =>
          row.type === 'chat_message' &&
          row.payload != null &&
          typeof (row.payload as { room_id?: string }).room_id === 'string',
      )
      .map((row) => (row.payload as { room_id: string }).room_id),
  );

const loadActors = async (actorIds: string[]) => {
  if (actorIds.length === 0) return {} as Record<string, ActorProfile>;
  const { data } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar')
    .in('id', actorIds);

  return Object.fromEntries(
    asArray(data).map((profile) => [
      profile.id,
      {
        handle: profile.handle ?? null,
        display_name: profile.display_name ?? null,
        avatar: profile.avatar ?? null,
      },
    ]),
  ) as Record<string, ActorProfile>;
};

const loadFeedMetadata = async (feedIds: string[]) => {
  const feedExists = new Set<string>();
  const feedSnippets: Record<string, string> = {};
  const feedThumbnails: Record<string, string> = {};

  if (feedIds.length === 0) {
    return { feedExists, feedSnippets, feedThumbnails };
  }

  const { data } = await supabase
    .from('feed_items')
    .select('id, payload')
    .in('id', feedIds);

  for (const row of asArray(data) as {
    id: string;
    payload?: {
      body?: string;
      text?: string;
      images?: string[];
      snapshot?: { url?: string };
    };
  }[]) {
    feedExists.add(row.id);
    const text = (row.payload?.body ?? row.payload?.text ?? '').trim();
    if (text) {
      feedSnippets[row.id] =
        text.length <= POST_PREVIEW_MAX_LENGTH
          ? text
          : `${text.slice(0, POST_PREVIEW_MAX_LENGTH)}\u2026`;
    }

    const firstImage =
      Array.isArray(row.payload?.images) && row.payload.images.length > 0
        ? row.payload.images[0]
        : row.payload?.snapshot?.url;

    if (typeof firstImage === 'string' && firstImage.trim()) {
      feedThumbnails[row.id] = firstImage.trim();
    }
  }

  return { feedExists, feedSnippets, feedThumbnails };
};

const loadExistingIds = async (
  table: 'events' | 'chat_rooms',
  ids: string[],
) => {
  if (ids.length === 0) return new Set<string>();
  const { data } = await supabase.from(table).select('id').in('id', ids);
  return new Set(asArray(data).map((row: { id: string }) => row.id));
};

const loadPendingConnectionRequestIds = async (
  recipientId: string,
  requestIds: string[],
) => {
  if (requestIds.length === 0) return new Set<string>();

  const { data } = await supabase
    .from('connection_requests')
    .select('id, status')
    .eq('recipient_id', recipientId)
    .in('id', requestIds);

  return new Set(
    asArray(data)
      .filter((row) => row.status === 'pending')
      .map((row) => row.id),
  );
};

const referenceExists = (
  row: NotificationRow,
  feedExists: Set<string>,
  eventExists: Set<string>,
  roomExists: Set<string>,
) => {
  if (row.reference_type === 'feed_item' && row.reference_id)
    return feedExists.has(row.reference_id);
  if (
    (row.type === 'event_rsvp' || row.reference_type === 'event') &&
    row.reference_id
  ) {
    return eventExists.has(row.reference_id);
  }
  if (
    row.type === 'chat_message' &&
    row.payload != null &&
    typeof (row.payload as { room_id?: string }).room_id === 'string'
  ) {
    return roomExists.has((row.payload as { room_id: string }).room_id);
  }
  return true;
};

export const fetchNotificationRows = async (
  recipientId: string,
): Promise<NotificationRow[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, recipient_id, actor_id, type, reference_id, reference_type, payload, created_at, read_at',
    )
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return [];

  const rows = asArray(data) as NotificationRow[];
  const actorIds = unique(
    rows.map((row) => row.actor_id).filter((id): id is string => id != null),
  );

  const feedRefs = collectIds(
    rows,
    (row) => row.reference_type === 'feed_item' && row.reference_id != null,
  );
  const eventRefs = collectIds(
    rows,
    (row) =>
      (row.type === 'event_rsvp' || row.reference_type === 'event') &&
      row.reference_id != null,
  );
  const chatRoomIds = collectChatRoomIds(rows);
  const connectionRequestIds = collectIds(
    rows,
    (row) => row.type === 'connection_request' && row.reference_id != null,
  );

  const [
    actors,
    feedData,
    eventExists,
    roomExists,
    pendingConnectionRequestIds,
  ] = await Promise.all([
    loadActors(actorIds),
    loadFeedMetadata(feedRefs),
    loadExistingIds('events', eventRefs),
    loadExistingIds('chat_rooms', chatRoomIds),
    loadPendingConnectionRequestIds(recipientId, connectionRequestIds),
  ]);

  return rows.map((row) => {
    const actor = row.actor_id ? actors[row.actor_id] : null;
    const exists = referenceExists(
      row,
      feedData.feedExists,
      eventExists,
      roomExists,
    );
    const isPostRelated =
      row.reference_type === 'feed_item' &&
      row.reference_id != null &&
      POST_RELATED_TYPES.has(row.type);

    return {
      ...row,
      payload: (row.payload ?? {}) as NotificationPayload,
      actor_handle: actor?.handle ?? null,
      actor_display_name: actor?.display_name ?? null,
      actor_avatar: actor?.avatar ?? null,
      reference_exists: exists,
      connection_request_pending:
        row.type === 'connection_request' && row.reference_id != null
          ? pendingConnectionRequestIds.has(row.reference_id)
          : undefined,
      post_snippet:
        isPostRelated && exists && row.reference_id
          ? (feedData.feedSnippets[row.reference_id] ?? null)
          : undefined,
      post_thumbnail:
        isPostRelated && row.reference_id
          ? (feedData.feedThumbnails[row.reference_id] ?? null)
          : undefined,
    };
  });
};
