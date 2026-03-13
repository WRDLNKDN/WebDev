import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CodeIcon from '@mui/icons-material/Code';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import LinkIcon from '@mui/icons-material/Link';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import ThumbDownOffAltOutlinedIcon from '@mui/icons-material/ThumbDownOffAltOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useMemo, useState } from 'react';
import { formatPostTime } from '../../lib/post/formatPostTime';
import { PostCard } from '../../components/post';
import {
  extractBodyUrls,
  isGifUrl,
  type LinkPreviewPayload,
  removeGifUrlsFromBody,
} from './feedRenderUtils';
import { FeedCardCommentsSection } from './feedCardCommentsSection';
import { FeedCardEngagementActions } from './feedCardEngagementActions';
import { FeedCardImageDialog } from './feedCardImageDialog';
import { FeedCardPostContent } from './feedCardPostContent';
import { FeedCardRepostEmbed } from './feedCardRepostEmbed';
import { FeedCardRepostMeta } from './feedCardRepostMeta';
import type { FeedCardProps, PreviewImageSource } from './feedCardTypes';
export {
  hasRenderableContent,
  type LocalFeedDisplayItem,
} from './feedCardTypes';
import { useFeedCardActions } from './useFeedCardActions';
import { useFeedCardImagePreview } from './useFeedCardImagePreview';

export const FeedCard = ({
  item,
  actions,
  isOwner,
  viewerUserId,
  viewerAvatarUrl,
  viewerReposted = false,
  viewerSent = false,
  commentsExpanded,
  comments,
  commentsLoading,
  onAddComment,
  isLinkPreviewDismissed,
  onDismissLinkPreview,
}: FeedCardProps) => {
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSelectedGif, setCommentSelectedGif] = useState<string | null>(
    null,
  );
  const [commentGifPickerOpen, setCommentGifPickerOpen] = useState(false);
  const [commentEmojiAnchor, setCommentEmojiAnchor] =
    useState<HTMLElement | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostDraft, setEditPostDraft] = useState('');
  const [savingPostEdit, setSavingPostEdit] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState('');
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const displayName =
    (item.actor?.display_name as string) || item.actor?.handle || 'Weirdling';
  const handle = (item.actor?.handle as string) || null;
  const snapshot =
    item.kind === 'repost' && item.payload?.snapshot
      ? (item.payload.snapshot as {
          body?: string;
          created_at?: string;
          actor_handle?: string;
          actor_display_name?: string;
          actor_avatar?: string;
        })
      : null;
  const repostCommentary =
    item.kind === 'repost'
      ? (item.payload?.body as string) || (item.payload?.text as string) || ''
      : '';
  const repostOriginalHandle =
    typeof snapshot?.actor_handle === 'string' && snapshot.actor_handle.trim()
      ? snapshot.actor_handle.trim()
      : null;
  const repostOriginalName =
    typeof snapshot?.actor_display_name === 'string' &&
    snapshot.actor_display_name.trim()
      ? snapshot.actor_display_name.trim()
      : repostOriginalHandle;
  const repostOriginalId =
    item.kind === 'repost' && typeof item.payload?.original_id === 'string'
      ? item.payload.original_id
      : null;
  const repostOriginalBody =
    item.kind === 'repost' ? (snapshot?.body as string) || '' : '';
  const body =
    repostCommentary ||
    (item.payload?.body as string) ||
    (item.payload?.text as string) ||
    (item.kind === 'external_link' && item.payload?.url
      ? String(item.payload?.url)
      : '');
  const url =
    item.kind === 'external_link' ? (item.payload?.url as string) : null;
  const label =
    item.kind === 'external_link' ? (item.payload?.label as string) : null;
  const linkPreview = item.payload?.link_preview as
    | LinkPreviewPayload
    | undefined;
  const bodyGifUrls = useMemo(
    () => extractBodyUrls(body).filter(isGifUrl),
    [body],
  );
  const bodyGifUrlSet = useMemo(() => new Set(bodyGifUrls), [bodyGifUrls]);
  const postAttachmentImages = useMemo(
    () =>
      Array.isArray(item.payload?.images)
        ? ((item.payload.images as string[]).filter(
            (imgUrl) => !bodyGifUrlSet.has(imgUrl),
          ) as string[])
        : [],
    [bodyGifUrlSet, item.payload?.images],
  );
  const previewableImages = useMemo(() => {
    const ordered: { url: string; source: PreviewImageSource }[] = [];
    const seen = new Set<string>();
    for (const gifUrl of bodyGifUrls) {
      if (seen.has(gifUrl)) continue;
      seen.add(gifUrl);
      ordered.push({ url: gifUrl, source: 'body_gif' });
    }
    for (const imageUrl of postAttachmentImages) {
      if (seen.has(imageUrl)) continue;
      seen.add(imageUrl);
      ordered.push({ url: imageUrl, source: 'post_attachment' });
    }
    return ordered;
  }, [bodyGifUrls, postAttachmentImages]);
  const bodyTextWithoutGifUrls = removeGifUrlsFromBody(body);
  const canonicalPostUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/feed?post=${item.id}`
      : `/feed?post=${item.id}`;
  const embedSnippet = `<blockquote data-weirdlkn-post="${item.id}">${bodyTextWithoutGifUrls || body || displayName}</blockquote>`;
  const likeCount = item.like_count ?? 0;
  const loveCount = item.love_count ?? 0;
  const inspirationCount = item.inspiration_count ?? 0;
  const careCount = item.care_count ?? 0;
  const laughingCount = item.laughing_count ?? 0;
  const rageCount = item.rage_count ?? 0;
  const viewerReaction = item.viewer_reaction ?? null;
  const commentCount = item.comment_count ?? 0;
  const isPostEdited = Boolean(item.edited_at);
  const actorAvatar =
    viewerUserId && item.user_id === viewerUserId
      ? (viewerAvatarUrl ?? (item.actor?.avatar as string) ?? null)
      : ((item.actor?.avatar as string) ?? null);
  const {
    imagePreviewState,
    setImagePreviewState,
    imageTouchStartXRef,
    imageLightboxUrl,
    currentPreviewIndex,
    openImageLightbox,
    handlePreviewPrevious,
    handlePreviewNext,
    closeImageLightbox,
  } = useFeedCardImagePreview(item.id, previewableImages);

  const { handleReaction, handleAddComment, handleSavePostEdit } =
    useFeedCardActions({
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
    });

  return (
    <>
      <PostCard
        author={{
          avatarUrl: actorAvatar,
          displayName,
          handle,
          description: item.actor?.bio ?? null,
          createdAt: item.created_at,
          editedAt: isPostEdited ? item.edited_at : null,
          formatTime: formatPostTime,
          children:
            item.kind === 'repost' ? (
              <FeedCardRepostMeta
                repostOriginalHandle={repostOriginalHandle}
                repostOriginalName={repostOriginalName}
                repostOriginalId={repostOriginalId}
              />
            ) : undefined,
        }}
        actionMenu={{
          visible: !isEditingPost,
          ariaLabel: 'Post options',
          items: [
            {
              label: item.viewer_saved ? 'Unsave' : 'Save',
              icon: item.viewer_saved ? (
                <BookmarkIcon fontSize="small" />
              ) : (
                <BookmarkBorderIcon fontSize="small" />
              ),
              onClick: () =>
                item.viewer_saved
                  ? actions.onUnsave(item.id)
                  : actions.onSave(item.id),
            },
            {
              label: 'Copy link to post',
              icon: <LinkIcon fontSize="small" />,
              onClick: () => actions.onCopyLink(canonicalPostUrl),
            },
            {
              label: 'Embed this post',
              icon: <CodeIcon fontSize="small" />,
              onClick: () => actions.onCopyLink(embedSnippet),
            },
            ...(!isOwner && handle
              ? [
                  {
                    label: `Unfollow ${displayName}`,
                    icon: <PersonOffOutlinedIcon fontSize="small" />,
                    onClick: () =>
                      actions.onMenuInfo(
                        `Unfollow for @${handle} is coming soon.`,
                      ),
                  },
                ]
              : []),
            ...(!isOwner
              ? [
                  {
                    label: 'Not interested',
                    icon: <ThumbDownOffAltOutlinedIcon fontSize="small" />,
                    onClick: () =>
                      actions.onMenuInfo('We will show fewer posts like this.'),
                  },
                  {
                    label: 'Report post',
                    icon: <FlagOutlinedIcon fontSize="small" />,
                    onClick: () =>
                      actions.onMenuInfo('Report flow is coming soon.'),
                  },
                ]
              : []),
            ...(isOwner && item.kind === 'post'
              ? [
                  {
                    label: 'Edit',
                    icon: <EditOutlinedIcon fontSize="small" />,
                    onClick: () => {
                      setEditPostDraft(body);
                      setIsEditingPost(true);
                    },
                  },
                ]
              : []),
            ...(isOwner
              ? [
                  {
                    label: 'Delete',
                    icon: <DeleteOutlineIcon fontSize="small" />,
                    onClick: () => actions.onDelete(item.id),
                    danger: true,
                  },
                ]
              : []),
          ],
        }}
        sx={
          item.kind === 'repost'
            ? {
                mb: 2,
                borderColor: 'rgba(141,188,229,0.3)',
                boxShadow:
                  '0 22px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(56,132,210,0.1) inset',
                background:
                  'linear-gradient(180deg, rgba(24,30,43,0.98) 0%, rgba(19,24,34,0.96) 100%)',
              }
            : { mb: 2 }
        }
      >
        <FeedCardPostContent
          isEditingPost={isEditingPost}
          editPostDraft={editPostDraft}
          setEditPostDraft={setEditPostDraft}
          handleSavePostEdit={handleSavePostEdit}
          savingPostEdit={savingPostEdit}
          setIsEditingPost={setIsEditingPost}
          body={body}
          bodyTextWithoutGifUrls={bodyTextWithoutGifUrls}
          bodyGifUrls={bodyGifUrls}
          openImageLightbox={openImageLightbox}
          linkPreview={linkPreview}
          isLinkPreviewDismissed={isLinkPreviewDismissed}
          onDismissLinkPreview={onDismissLinkPreview}
          postAttachmentImages={postAttachmentImages}
          url={url}
          label={label}
        />
        {item.kind === 'repost' ? (
          <FeedCardRepostEmbed
            originalAvatarUrl={(snapshot?.actor_avatar as string) ?? null}
            originalHandle={repostOriginalHandle}
            originalName={repostOriginalName}
            originalBody={repostOriginalBody}
            originalCreatedAt={(snapshot?.created_at as string) ?? null}
            repostOriginalId={repostOriginalId}
          />
        ) : null}
        <FeedCardEngagementActions
          item={item}
          actions={actions}
          viewerReaction={viewerReaction}
          viewerReposted={viewerReposted}
          viewerSent={viewerSent}
          likeCount={likeCount}
          loveCount={loveCount}
          inspirationCount={inspirationCount}
          careCount={careCount}
          laughingCount={laughingCount}
          rageCount={rageCount}
          commentCount={commentCount}
          commentsExpanded={commentsExpanded}
          handleReaction={handleReaction}
        />
        <FeedCardCommentsSection
          commentsExpanded={commentsExpanded}
          commentsLoading={commentsLoading}
          comments={comments}
          itemId={item.id}
          viewerUserId={viewerUserId}
          actions={actions}
          editingCommentId={editingCommentId}
          setEditingCommentId={setEditingCommentId}
          editCommentDraft={editCommentDraft}
          setEditCommentDraft={setEditCommentDraft}
          savingCommentEdit={savingCommentEdit}
          setSavingCommentEdit={setSavingCommentEdit}
          commentDraft={commentDraft}
          setCommentDraft={setCommentDraft}
          commentSelectedGif={commentSelectedGif}
          setCommentSelectedGif={setCommentSelectedGif}
          commentGifPickerOpen={commentGifPickerOpen}
          setCommentGifPickerOpen={setCommentGifPickerOpen}
          commentEmojiAnchor={commentEmojiAnchor}
          setCommentEmojiAnchor={setCommentEmojiAnchor}
          handleAddComment={handleAddComment}
          submittingComment={submittingComment}
        />
      </PostCard>
      <FeedCardImageDialog
        imageLightboxUrl={imageLightboxUrl}
        closeImageLightbox={closeImageLightbox}
        previewableImages={previewableImages}
        imageTouchStartXRef={imageTouchStartXRef}
        handlePreviewNext={handlePreviewNext}
        handlePreviewPrevious={handlePreviewPrevious}
        imagePreviewState={imagePreviewState}
        setImagePreviewState={setImagePreviewState}
        currentPreviewIndex={currentPreviewIndex}
      />
    </>
  );
};
