import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import type { FeedComment } from '../../lib/api/feedsApi';
import type { FeedCardActions } from './feedCardTypes';
import { FeedCardCommentsComposer } from './feedCardCommentsComposer';
import { FeedCardCommentsList } from './feedCardCommentsList';

type FeedCardCommentsSectionProps = {
  commentsExpanded: boolean;
  commentsLoading: boolean;
  comments: FeedComment[];
  itemId: string;
  viewerUserId?: string;
  actions: FeedCardActions;
  editingCommentId: string | null;
  setEditingCommentId: (value: string | null) => void;
  editCommentDraft: string;
  setEditCommentDraft: (value: string) => void;
  savingCommentEdit: boolean;
  setSavingCommentEdit: (value: boolean) => void;
  commentDraft: string;
  setCommentDraft: (value: string | ((prev: string) => string)) => void;
  commentSelectedGif: string | null;
  setCommentSelectedGif: (value: string | null) => void;
  commentGifPickerOpen: boolean;
  setCommentGifPickerOpen: (value: boolean) => void;
  commentEmojiAnchor: HTMLElement | null;
  setCommentEmojiAnchor: (value: HTMLElement | null) => void;
  handleAddComment: () => void | Promise<void>;
  submittingComment: boolean;
};

export const FeedCardCommentsSection = ({
  commentsExpanded,
  commentsLoading,
  comments,
  itemId,
  viewerUserId,
  actions,
  editingCommentId,
  setEditingCommentId,
  editCommentDraft,
  setEditCommentDraft,
  savingCommentEdit,
  setSavingCommentEdit,
  commentDraft,
  setCommentDraft,
  commentSelectedGif,
  setCommentSelectedGif,
  commentGifPickerOpen,
  setCommentGifPickerOpen,
  commentEmojiAnchor,
  setCommentEmojiAnchor,
  handleAddComment,
  submittingComment,
}: FeedCardCommentsSectionProps) => {
  if (!commentsExpanded) return null;
  return (
    <Box sx={{ mt: 2, pl: 0 }}>
      {commentsLoading ? (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading comments…
          </Typography>
        </Stack>
      ) : (
        <>
          <FeedCardCommentsList
            comments={comments}
            itemId={itemId}
            viewerUserId={viewerUserId}
            actions={actions}
            editingCommentId={editingCommentId}
            setEditingCommentId={setEditingCommentId}
            editCommentDraft={editCommentDraft}
            setEditCommentDraft={setEditCommentDraft}
            savingCommentEdit={savingCommentEdit}
            setSavingCommentEdit={setSavingCommentEdit}
          />
          <FeedCardCommentsComposer
            commentDraft={commentDraft}
            setCommentDraft={setCommentDraft}
            commentSelectedGif={commentSelectedGif}
            setCommentSelectedGif={setCommentSelectedGif}
            commentGifPickerOpen={commentGifPickerOpen}
            setCommentGifPickerOpen={setCommentGifPickerOpen}
            commentEmojiAnchor={commentEmojiAnchor}
            setCommentEmojiAnchor={setCommentEmojiAnchor}
            onSubmit={handleAddComment}
            submittingComment={submittingComment}
          />
        </>
      )}
    </Box>
  );
};
