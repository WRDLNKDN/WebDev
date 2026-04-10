import type { LinkPreviewOverrides } from '../linkPreview';
import { API_BASE, postFeed, requestNoContent } from './feedsApiCore';
import type { ReactionType } from './feedsApiTypes';

export async function createFeedPost(params: {
  body: string;
  images?: string[];
  scheduledAt?: string | null;
  accessToken?: string | null;
  /** Same UUID on retry so the API can dedupe if the first write succeeded but the client errored. */
  clientPostId?: string | null;
  /** Optional unfurl overrides merged server-side after OG fetch. */
  linkPreviewOverrides?: LinkPreviewOverrides | null;
}): Promise<void> {
  const text = params.body.trim();
  if (!text) throw new Error('Post body is required');
  const body: Record<string, unknown> = { kind: 'post', body: text };
  if (params.images?.length) body.images = params.images;
  if (params.scheduledAt) body.scheduled_at = params.scheduledAt;
  if (params.clientPostId?.trim()) {
    body.client_post_id = params.clientPostId.trim();
  }
  if (Object.prototype.hasOwnProperty.call(params, 'linkPreviewOverrides')) {
    body.link_preview_overrides = params.linkPreviewOverrides;
  }
  await postFeed(body, params.accessToken ?? null);
}

export async function createFeedExternalLink(params: {
  url: string;
  label?: string;
  accessToken?: string | null;
  linkPreviewOverrides?: LinkPreviewOverrides | null;
}): Promise<void> {
  const url = params.url.trim();
  if (!url) throw new Error('URL is required');
  const body: Record<string, unknown> = { kind: 'external_link', url };
  if (params.label && params.label.trim()) body.label = params.label.trim();
  if (Object.prototype.hasOwnProperty.call(params, 'linkPreviewOverrides')) {
    body.link_preview_overrides = params.linkPreviewOverrides;
  }
  await postFeed(body, params.accessToken ?? null);
}

export async function setReaction(params: {
  postId: string;
  type: ReactionType;
  accessToken?: string | null;
}): Promise<void> {
  if (!params.postId.trim()) throw new Error('Post id is required');
  await postFeed(
    { kind: 'reaction', parent_id: params.postId, type: params.type },
    params.accessToken ?? null,
  );
}

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
  if (!params.postId.trim()) throw new Error('Post id is required');
  const url = `${API_BASE}/api/feeds/items/${encodeURIComponent(params.postId)}/reaction`;
  await requestNoContent(url, { method: 'DELETE' }, params.accessToken ?? null);
}

export async function unlikePost(params: {
  postId: string;
  accessToken?: string | null;
}): Promise<void> {
  await removeReaction(params);
}

export async function repostPost(params: {
  originalId: string;
  commentary?: string;
  accessToken?: string | null;
}): Promise<void> {
  if (!params.originalId.trim())
    throw new Error('Original post id is required');
  const body: Record<string, unknown> = {
    kind: 'repost',
    original_id: params.originalId,
  };
  const commentary = params.commentary?.trim();
  if (commentary) body.body = commentary;
  await postFeed(body, params.accessToken ?? null);
}

export async function saveFeedPost(params: {
  postId: string;
  accessToken?: string | null;
}): Promise<void> {
  const postId = params.postId.trim();
  if (!postId) throw new Error('Post id is required');
  const url = `${API_BASE}/api/feeds/items/${encodeURIComponent(postId)}/save`;
  await requestNoContent(url, { method: 'POST' }, params.accessToken ?? null);
}

export async function unsaveFeedPost(params: {
  postId: string;
  accessToken?: string | null;
}): Promise<void> {
  const postId = params.postId.trim();
  if (!postId) throw new Error('Post id is required');
  const url = `${API_BASE}/api/feeds/items/${encodeURIComponent(postId)}/save`;
  await requestNoContent(url, { method: 'DELETE' }, params.accessToken ?? null);
}

export async function deleteFeedPost(params: {
  postId: string;
  accessToken?: string | null;
}): Promise<void> {
  if (!params.postId.trim()) throw new Error('Post id is required');
  const url = `${API_BASE}/api/feeds/items/${encodeURIComponent(params.postId)}`;
  await requestNoContent(url, { method: 'DELETE' }, params.accessToken ?? null);
}

export async function editFeedPost(params: {
  postId: string;
  body: string;
  accessToken?: string | null;
  /** When set (including null), sent to the API to merge or clear stored overrides. */
  linkPreviewOverrides?: LinkPreviewOverrides | null;
}): Promise<void> {
  const postId = params.postId.trim();
  const body = params.body.trim();
  if (!postId) throw new Error('Post id is required');
  if (!body) throw new Error('Post body is required');
  const url = `${API_BASE}/api/feeds/items/${encodeURIComponent(postId)}`;
  const payload: Record<string, unknown> = { body };
  if (Object.prototype.hasOwnProperty.call(params, 'linkPreviewOverrides')) {
    payload.link_preview_overrides = params.linkPreviewOverrides;
  }
  await requestNoContent(
    url,
    { method: 'PATCH', body: JSON.stringify(payload) },
    params.accessToken ?? null,
  );
}
