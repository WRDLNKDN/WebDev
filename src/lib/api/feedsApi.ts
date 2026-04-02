import { API_BASE, requestAuthedJson } from './feedsApiCore';
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
  return requestAuthedJson<FeedsResponse>(
    url,
    { method: 'GET' },
    {
      accessToken: options?.accessToken ?? null,
      statusMessages: {
        404: "Feed API not found. Run 'npm run dev' to start all services (Vite, Supabase, and the API).",
        503: "API server isn't running. Run 'npm run dev' or start it with 'npm run api'.",
      },
    },
  );
}
