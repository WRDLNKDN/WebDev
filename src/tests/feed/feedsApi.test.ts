import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authedFetchMock } = vi.hoisted(() => ({
  authedFetchMock: vi.fn(),
}));

vi.mock('../../lib/api/authFetch', () => ({
  authedFetch: authedFetchMock,
}));

import {
  deleteFeedComment,
  deleteFeedPost,
  editFeedComment,
  editFeedPost,
} from '../../lib/api/feedsApi';

describe('feedsApi mutation routes', () => {
  beforeEach(() => {
    authedFetchMock.mockReset();
    authedFetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  it('edits a post via PATCH /api/feeds/items/:id', async () => {
    await editFeedPost({
      postId: 'post-1',
      body: ' Updated body ',
      accessToken: 'token-1',
    });

    expect(authedFetchMock).toHaveBeenCalledWith(
      '/api/feeds/items/post-1',
      {
        method: 'PATCH',
        body: JSON.stringify({ body: 'Updated body' }),
      },
      expect.objectContaining({
        accessToken: 'token-1',
        includeJsonContentType: true,
      }),
    );
  });

  it('deletes a post via DELETE /api/feeds/items/:id', async () => {
    await deleteFeedPost({
      postId: 'post-2',
      accessToken: 'token-2',
    });

    expect(authedFetchMock).toHaveBeenCalledWith(
      '/api/feeds/items/post-2',
      { method: 'DELETE' },
      expect.objectContaining({
        accessToken: 'token-2',
        includeJsonContentType: true,
      }),
    );
  });

  it('edits a comment via PATCH /api/feeds/comments/:id', async () => {
    await editFeedComment({
      commentId: 'comment-1',
      body: ' Updated comment ',
      accessToken: 'token-3',
    });

    expect(authedFetchMock).toHaveBeenCalledWith(
      '/api/feeds/comments/comment-1',
      {
        method: 'PATCH',
        body: JSON.stringify({ body: 'Updated comment' }),
      },
      expect.objectContaining({
        accessToken: 'token-3',
        includeJsonContentType: true,
      }),
    );
  });

  it('deletes a comment via DELETE /api/feeds/comments/:id', async () => {
    await deleteFeedComment({
      commentId: 'comment-2',
      accessToken: 'token-4',
    });

    expect(authedFetchMock).toHaveBeenCalledWith(
      '/api/feeds/comments/comment-2',
      { method: 'DELETE' },
      expect.objectContaining({
        accessToken: 'token-4',
        includeJsonContentType: true,
      }),
    );
  });

  it('validates required ids and bodies before fetch', async () => {
    await expect(
      editFeedPost({ postId: ' ', body: 'x', accessToken: null }),
    ).rejects.toThrow('Post id is required');
    await expect(
      editFeedComment({ commentId: 'c', body: ' ', accessToken: null }),
    ).rejects.toThrow('Comment body is required');
    await expect(
      deleteFeedPost({ postId: ' ', accessToken: null }),
    ).rejects.toThrow('Post id is required');
    await expect(
      deleteFeedComment({ commentId: ' ', accessToken: null }),
    ).rejects.toThrow('Comment id is required');
  });
});
