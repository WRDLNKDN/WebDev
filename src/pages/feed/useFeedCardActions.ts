import { useCallback } from 'react';
import type { FeedItem, ReactionType } from '../../lib/api/feedsApi';
import type { FeedCardActions } from './feedCardTypes';

type UseFeedCardActionsArgs = {
  item: FeedItem;
  actions: FeedCardActions;
  viewerReaction: ReactionType | null;
  likeCount: number;
  loveCount: number;
  inspirationCount: number;
  careCount: number;
  laughingCount: number;
  rageCount: number;
  commentDraft: string;
  commentSelectedGif: string | null;
  submittingComment: boolean;
  setSubmittingComment: (value: boolean) => void;
  setCommentDraft: (value: string) => void;
  setCommentSelectedGif: (value: string | null) => void;
  onAddComment: (postId: string, body: string) => void;
  editPostDraft: string;
  savingPostEdit: boolean;
  setSavingPostEdit: (value: boolean) => void;
  setIsEditingPost: (value: boolean) => void;
};

export const useFeedCardActions = ({
  item,
  actions,
  viewerReaction,
  likeCount,
  loveCount,
  inspirationCount,
  careCount,
  laughingCount,
  rageCount,
  commentDraft,
  commentSelectedGif,
  submittingComment,
  setSubmittingComment,
  setCommentDraft,
  setCommentSelectedGif,
  onAddComment,
  editPostDraft,
  savingPostEdit,
  setSavingPostEdit,
  setIsEditingPost,
}: UseFeedCardActionsArgs) => {
  const handleReaction = useCallback(
    (type: ReactionType) => {
      if (viewerReaction === type) {
        actions.onRemoveReaction(item.id);
        actions.updateItem(item.id, {
          viewer_reaction: null,
          like_count: type === 'like' ? Math.max(0, likeCount - 1) : likeCount,
          love_count: type === 'love' ? Math.max(0, loveCount - 1) : loveCount,
          inspiration_count:
            type === 'inspiration'
              ? Math.max(0, inspirationCount - 1)
              : inspirationCount,
          care_count: type === 'care' ? Math.max(0, careCount - 1) : careCount,
          laughing_count:
            type === 'laughing'
              ? Math.max(0, laughingCount - 1)
              : laughingCount,
          rage_count: type === 'rage' ? Math.max(0, rageCount - 1) : rageCount,
        });
        return;
      }

      actions.onReaction(item.id, type);
      const prevType = viewerReaction;
      actions.updateItem(item.id, {
        viewer_reaction: type,
        like_count:
          (type === 'like' ? 1 : 0) +
          (prevType === 'like' ? likeCount - 1 : likeCount),
        love_count:
          (type === 'love' ? 1 : 0) +
          (prevType === 'love' ? loveCount - 1 : loveCount),
        inspiration_count:
          (type === 'inspiration' ? 1 : 0) +
          (prevType === 'inspiration'
            ? inspirationCount - 1
            : inspirationCount),
        care_count:
          (type === 'care' ? 1 : 0) +
          (prevType === 'care' ? careCount - 1 : careCount),
        laughing_count:
          (type === 'laughing' ? 1 : 0) +
          (prevType === 'laughing' ? laughingCount - 1 : laughingCount),
        rage_count:
          (type === 'rage' ? 1 : 0) +
          (prevType === 'rage' ? rageCount - 1 : rageCount),
      });
    },
    [
      actions,
      careCount,
      inspirationCount,
      item.id,
      laughingCount,
      likeCount,
      loveCount,
      rageCount,
      viewerReaction,
    ],
  );

  const handleAddComment = useCallback(async () => {
    const text = commentDraft.trim();
    const hasContent = text || commentSelectedGif;
    if (!hasContent || submittingComment) return;
    setSubmittingComment(true);
    try {
      const body = commentSelectedGif
        ? `${text}\n${commentSelectedGif}`.trim()
        : text;
      await onAddComment(item.id, body);
      setCommentDraft('');
      setCommentSelectedGif(null);
      actions.updateItem(item.id, {
        comment_count: (item.comment_count ?? 0) + 1,
      });
    } finally {
      setSubmittingComment(false);
    }
  }, [
    actions,
    commentDraft,
    commentSelectedGif,
    item.comment_count,
    item.id,
    onAddComment,
    setCommentDraft,
    setCommentSelectedGif,
    setSubmittingComment,
    submittingComment,
  ]);

  const handleSavePostEdit = useCallback(async () => {
    const nextBody = editPostDraft.trim();
    if (!nextBody || savingPostEdit) return;
    setSavingPostEdit(true);
    try {
      await actions.onEditPost(item.id, nextBody);
      actions.updateItem(item.id, {
        payload: { ...(item.payload ?? {}), body: nextBody },
        edited_at: new Date().toISOString(),
      });
      setIsEditingPost(false);
    } finally {
      setSavingPostEdit(false);
    }
  }, [
    actions,
    editPostDraft,
    item.id,
    item.payload,
    savingPostEdit,
    setIsEditingPost,
    setSavingPostEdit,
  ]);

  return { handleReaction, handleAddComment, handleSavePostEdit };
};
