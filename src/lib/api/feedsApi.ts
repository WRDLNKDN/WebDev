/**
 * Feeds API client — /api/feeds (activity stream).
 * GET: cursor-based pagination. POST: create posts / external links.
 * Authenticated; WRDLNKDN-native content only.
 *
 * Production: set VITE_API_URL to your backend origin so /api/feeds is requested
 * from the API server. Otherwise the SPA host may return HTML → "Unexpected token '<'".
 *
 * Error handling:
 * - Network/CORS failures: fetch() throws; let the caller handle (e.g. Feed.tsx).
 * - Non-OK response: we parse error body as JSON; if the body is HTML we throw a
 *   clear "returned HTML" error (so devs set VITE_API_URL); else we throw with
 *   body.error or res.statusText.
 * - Success body: we parse with secure-json-parse; if the body is HTML or invalid we throw a
 *   clear message instead of a raw JSON parse error.
 */

import sjson from 'secure-json-parse';
import { messageFromApiResponse } from '../utils/errors';

/**
 * Base URL for API requests (origin only; do not include /api).
 * Vite bakes this at build time from VITE_API_URL. If you set VITE_API_URL in Vercel
 * after the last deploy, you must redeploy (new build) for it to take effect.
 */
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

/**
 * Parse response body as JSON using secure-json-parse (prototype-poisoning safe).
 * - If body looks like HTML (starts with '<') → throw clear "set VITE_API_URL" error.
 * - If body is empty → throw short message (avoids confusing JSON parse error).
 * - Otherwise → sjson.parse; on failure throw with a short body snippet.
 */
async function parseJsonResponse<T>(
  res: Response,
  requestUrl?: string,
): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith('<!')) {
    const urlHint = requestUrl ? ` Request URL: ${requestUrl}.` : '';
    throw new Error(
      `Feeds API returned HTML instead of JSON.${urlHint} Set VITE_API_URL to your ` +
        `API origin only (e.g. https://api.wrdlnkdn.com) — no trailing /api. Redeploy ` +
        `after changing the env so the build picks it up. If VITE_API_URL is already set, ` +
        `ensure the API server is running and returns JSON for /api/feeds.`,
    );
  }
  if (trimmed === '') {
    throw new Error('Feeds API returned an empty response.');
  }
  try {
    return sjson.parse(text, undefined, {
      protoAction: 'remove',
      constructorAction: 'remove',
    }) as T;
  } catch {
    throw new Error(
      `Feeds API returned invalid JSON: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? '...' : ''}`,
    );
  }
}

async function getAuthHeaders(
  accessToken?: string | null,
): Promise<HeadersInit> {
  let token = accessToken;
  if (token == null) {
    const { supabase } = await import('../auth/supabaseClient');
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

export type ReactionType = 'like' | 'love' | 'inspiration' | 'care';

export type FeedItem = {
  id: string;
  user_id: string;
  kind: 'post' | 'profile_update' | 'external_link' | 'repost' | 'reaction';
  payload: Record<string, unknown>;
  parent_id?: string | null;
  created_at: string;
  actor: FeedItemActor;
  like_count?: number;
  love_count?: number;
  inspiration_count?: number;
  care_count?: number;
  viewer_reaction?: ReactionType | null;
  comment_count?: number;
  /** @deprecated Use viewer_reaction instead */
  viewer_liked?: boolean;
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
  const res = await fetch(`${API_BASE}/api/feeds`, {
    method: 'POST',
    headers,
    credentials: API_BASE ? 'omit' : 'include',
    body: JSON.stringify(body),
  });

  const postUrl = `${API_BASE}/api/feeds`;
  if (!res.ok) {
    let payload: { error?: string; message?: string };
    try {
      payload = await parseJsonResponse<{ error?: string; message?: string }>(
        res,
        postUrl,
      );
    } catch (e) {
      if (e instanceof Error && e.message.includes('returned HTML')) throw e;
      payload = {};
    }
    throw new Error(
      messageFromApiResponse(res.status, payload.error, payload.message),
    );
  }
}

export type FeedViewPreference = 'anyone' | 'connections';

export async function updateFeedViewPreference(params: {
  feedViewPreference: FeedViewPreference;
  accessToken?: string | null;
}): Promise<void> {
  const { supabase } = await import('../auth/supabaseClient');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('profiles')
    .update({ feed_view_preference: params.feedViewPreference })
    .eq('id', session.user.id);
  if (error) throw new Error(error.message);
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

  const url = `${API_BASE}/api/feeds?${params.toString()}`;
  const headers = await getAuthHeaders(options?.accessToken);
  const res = await fetch(url, {
    headers,
    credentials: API_BASE ? 'omit' : 'include',
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        "Feed API not found. Run 'npm run dev' to start all services (Vite, Supabase, and the API).",
      );
    }
    if (res.status === 503) {
      throw new Error(
        "API server isn't running. Run 'npm run dev' or start it with 'npm run api'.",
      );
    }
    let body: { error?: string };
    try {
      body = await parseJsonResponse<{ error?: string }>(res, url);
    } catch (e) {
      if (e instanceof Error && e.message.includes('returned HTML')) throw e;
      body = { error: undefined };
    }
    const msg = typeof body.error === 'string' ? body.error : undefined;
    throw new Error(messageFromApiResponse(res.status, msg));
  }

  return parseJsonResponse<FeedsResponse>(res, url);
}

export async function createFeedPost(params: {
  body: string;
  images?: string[];
  scheduledAt?: string | null;
  accessToken?: string | null;
}): Promise<void> {
  const text = params.body.trim();
  if (!text) throw new Error('Post body is required');
  const body: Record<string, unknown> = { kind: 'post', body: text };
  if (params.images?.length) body.images = params.images;
  if (params.scheduledAt) body.scheduled_at = params.scheduledAt;
  await postFeed(body, params.accessToken ?? null);
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

export async function setReaction(params: {
  postId: string;
  type: ReactionType;
  accessToken?: string | null;
}): Promise<void> {
  const { postId, type } = params;
  if (!postId.trim()) throw new Error('Post id is required');
  await postFeed(
    { kind: 'reaction', parent_id: postId, type },
    params.accessToken ?? null,
  );
}

/** @deprecated Use setReaction with type 'like' instead */
export async function likePost(params: {
  postId: string;
  accessToken?: string | null;
}): Promise<void> {
  await setReaction({
    postId: params.postId,
    type: 'like',
    accessToken: params.accessToken,
  });
}

export async function removeReaction(params: {
  postId: string;
  accessToken?: string | null;
}): Promise<void> {
  const { postId } = params;
  if (!postId.trim()) throw new Error('Post id is required');
  const headers = await getAuthHeaders(params.accessToken);
  const url = `${API_BASE}/api/feeds/items/${encodeURIComponent(postId)}/reaction`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
    credentials: API_BASE ? 'omit' : 'include',
  });
  if (!res.ok && res.status !== 204) {
    let body: { error?: string };
    try {
      body = await parseJsonResponse<{ error?: string }>(res, url);
    } catch (e) {
      if (e instanceof Error && e.message.includes('returned HTML')) throw e;
      body = { error: undefined };
    }
    const msg = typeof body.error === 'string' ? body.error : undefined;
    throw new Error(messageFromApiResponse(res.status, msg));
  }
}

/** @deprecated Use removeReaction instead */
export async function unlikePost(params: {
  postId: string;
  accessToken?: string | null;
}): Promise<void> {
  await removeReaction(params);
}

export type FeedComment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  actor: FeedItemActor;
};

export async function fetchComments(params: {
  postId: string;
  accessToken?: string | null;
}): Promise<{ data: FeedComment[] }> {
  const { postId } = params;
  if (!postId.trim()) throw new Error('Post id is required');
  const headers = await getAuthHeaders(params.accessToken);
  const commentsUrl = `${API_BASE}/api/feeds/items/${encodeURIComponent(postId)}/comments`;
  const res = await fetch(commentsUrl, {
    headers,
    credentials: API_BASE ? 'omit' : 'include',
  });
  if (!res.ok) {
    let body: { error?: string };
    try {
      body = await parseJsonResponse<{ error?: string }>(res, commentsUrl);
    } catch (e) {
      if (e instanceof Error && e.message.includes('returned HTML')) throw e;
      body = { error: undefined };
    }
    const msg = typeof body.error === 'string' ? body.error : undefined;
    throw new Error(messageFromApiResponse(res.status, msg));
  }
  return parseJsonResponse<{ data: FeedComment[] }>(res, commentsUrl);
}

export async function addComment(params: {
  postId: string;
  body: string;
  accessToken?: string | null;
}): Promise<void> {
  const { postId, body } = params;
  if (!postId.trim()) throw new Error('Post id is required');
  const text = body.trim();
  if (!text) throw new Error('Comment body is required');
  await postFeed(
    { kind: 'reaction', parent_id: postId, type: 'comment', body: text },
    params.accessToken ?? null,
  );
}

export async function repostPost(params: {
  originalId: string;
  accessToken?: string | null;
}): Promise<void> {
  const { originalId } = params;
  if (!originalId.trim()) throw new Error('Original post id is required');
  await postFeed(
    { kind: 'repost', original_id: originalId },
    params.accessToken ?? null,
  );
}

export async function deleteFeedPost(params: {
  postId: string;
  accessToken?: string | null;
}): Promise<void> {
  const { postId } = params;
  if (!postId.trim()) throw new Error('Post id is required');
  const { supabase } = await import('../auth/supabaseClient');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('feed_items')
    .delete()
    .eq('id', postId)
    .eq('user_id', session.user.id);
  if (error) throw new Error(error.message);
}
