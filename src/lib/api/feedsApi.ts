import { messageFromApiResponse } from '../utils/errors';
import { authedFetch } from './authFetch';
import { API_BASE, parseJsonResponse } from './feedsApiCore';
import type { FeedsResponse, FeedViewPreference } from './feedsApiTypes';

export type {
  FeedComment,
  FeedItem,
  FeedItemActor,
  FeedsResponse,
  FeedViewPreference,
  ReactionType,
} from './feedsApiTypes';

export {
  addComment,
  deleteFeedComment,
  editFeedComment,
  fetchComments,
} from './feedsApiComments';

export {
  createFeedExternalLink,
  createFeedPost,
  deleteFeedPost,
  editFeedPost,
  likePost,
  removeReaction,
  repostPost,
  saveFeedPost,
  setReaction,
  unlikePost,
  unsaveFeedPost,
} from './feedsApiPosts';

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
  saved?: boolean;
  accessToken?: string | null;
}): Promise<FeedsResponse> {
  const params = new URLSearchParams();
  const limit = options?.limit ?? 20;
  params.set('limit', String(Math.min(50, Math.max(1, limit))));
  if (options?.cursor?.trim()) params.set('cursor', options.cursor.trim());
  if (options?.saved === true) params.set('saved', 'true');

  const url = `${API_BASE}/api/feeds?${params.toString()}`;
  const res = await authedFetch(
    url,
    { method: 'GET' },
    {
      accessToken: options?.accessToken ?? null,
      includeJsonContentType: true,
      credentials: API_BASE ? 'omit' : 'include',
    },
  );

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
