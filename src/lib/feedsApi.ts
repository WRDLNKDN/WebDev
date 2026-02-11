/**
 * Feeds API client — /api/feeds (activity stream).
 * GET: cursor-based pagination. POST: create posts / external links.
 * Authenticated; WRDLNKDN-native content only.
 */

async function getAuthHeaders(
  accessToken?: string | null,
): Promise<HeadersInit> {
  let token = accessToken;
  if (token == null) {
    const { supabase } = await import('./supabaseClient');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token ?? null;
  }
  if (!token) {
    throw new Error('Not signed in');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export type FeedItemActor = {
  handle: string | null;
  display_name: string | null;
  avatar: string | null;
};

export type FeedItem = {
  id: string;
  user_id: string;
  kind: 'post' | 'profile_update' | 'external_link' | 'repost' | 'reaction';
  payload: Record<string, unknown>;
  parent_id?: string | null;
  created_at: string;
  actor: FeedItemActor;
};

export type FeedsResponse = {
  data: FeedItem[];
  nextCursor?: string;
};

async function postFeed(
  body: Record<string, unknown>,
  accessToken?: string | null,
): Promise<void> {
  const headers = await getAuthHeaders(accessToken);
  const res = await fetch('/api/feeds', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(
      (payload?.error as string) ||
        res.statusText ||
        'Failed to create feed item',
    );
  }
}

export async function fetchFeeds(options?: {
  limit?: number;
  cursor?: string;
  accessToken?: string | null;
}): Promise<FeedsResponse> {
  const params = new URLSearchParams();
  const limit = options?.limit ?? 20;
  params.set('limit', String(Math.min(50, Math.max(1, limit))));
  if (options?.cursor?.trim()) params.set('cursor', options.cursor.trim());

  const url = `/api/feeds?${params.toString()}`;
  const headers = await getAuthHeaders(options?.accessToken);
  const res = await fetch(url, { headers, credentials: 'include' });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body?.error as string) || res.statusText || 'Failed to load feed',
    );
  }

  return res.json() as Promise<FeedsResponse>;
}

export async function createFeedPost(params: {
  body: string;
  accessToken?: string | null;
}): Promise<void> {
  const text = params.body.trim();
  if (!text) throw new Error('Post body is required');
  await postFeed({ kind: 'post', body: text }, params.accessToken ?? null);
}

export async function createFeedExternalLink(params: {
  url: string;
  label?: string;
  accessToken?: string | null;
}): Promise<void> {
  const url = params.url.trim();
  if (!url) throw new Error('URL is required');
  const body: Record<string, unknown> = { kind: 'external_link', url };
  if (params.label && params.label.trim()) body.label = params.label.trim();
  await postFeed(body, params.accessToken ?? null);
}
