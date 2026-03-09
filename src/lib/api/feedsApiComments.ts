import {
  API_BASE,
  postFeed,
  requestJson,
  requestNoContent,
} from './feedsApiCore';
import type { FeedComment } from './feedsApiTypes';

export async function fetchComments(params: {
  postId: string;
  accessToken?: string | null;
}): Promise<{ data: FeedComment[] }> {
  const postId = params.postId.trim();
  if (!postId) throw new Error('Post id is required');
  const url = `${API_BASE}/api/feeds/items/${encodeURIComponent(postId)}/comments`;
  return requestJson<{ data: FeedComment[] }>(
    url,
    { method: 'GET' },
    params.accessToken ?? null,
  );
}

export async function addComment(params: {
  postId: string;
  body: string;
  accessToken?: string | null;
}): Promise<void> {
  const postId = params.postId.trim();
  const text = params.body.trim();
  if (!postId) throw new Error('Post id is required');
  if (!text) throw new Error('Comment body is required');
  await postFeed(
    { kind: 'reaction', parent_id: postId, type: 'comment', body: text },
    params.accessToken ?? null,
  );
}

export async function editFeedComment(params: {
  commentId: string;
  body: string;
  accessToken?: string | null;
}): Promise<void> {
  const commentId = params.commentId.trim();
  const body = params.body.trim();
  if (!commentId) throw new Error('Comment id is required');
  if (!body) throw new Error('Comment body is required');
  const url = `${API_BASE}/api/feeds/comments/${encodeURIComponent(commentId)}`;
  await requestNoContent(
    url,
    { method: 'PATCH', body: JSON.stringify({ body }) },
    params.accessToken ?? null,
  );
}

export async function deleteFeedComment(params: {
  commentId: string;
  accessToken?: string | null;
}): Promise<void> {
  const commentId = params.commentId.trim();
  if (!commentId) throw new Error('Comment id is required');
  const url = `${API_BASE}/api/feeds/comments/${encodeURIComponent(commentId)}`;
  await requestNoContent(url, { method: 'DELETE' }, params.accessToken ?? null);
}
