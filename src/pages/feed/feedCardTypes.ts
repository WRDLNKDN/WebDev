import type { FeedAdvertiser } from '../../components/feed/ad/feedAdTypes';
import type { FeedDisplayItem } from '../../lib/feed/adRotation';
import type {
  FeedComment,
  FeedItem,
  ReactionType,
} from '../../lib/api/feedsApi';

export type FeedCardActions = {
  updateItem: (id: string, patch: Partial<FeedItem>) => void;
  onReaction: (postId: string, type: ReactionType) => void;
  onRemoveReaction: (
    postId: string,
    previousType?: ReactionType | null,
  ) => void;
  onCommentReaction: (commentId: string, type: ReactionType) => void;
  onCommentRemoveReaction: (
    commentId: string,
    previousType?: ReactionType | null,
  ) => void;
  onRepost: (item: FeedItem) => void;
  onSend: (item: FeedItem) => void;
  onSave: (postId: string) => void;
  onUnsave: (postId: string) => void;
  onCopyLink: (url: string) => void;
  onMenuInfo: (message: string) => void;
  onCommentToggle: (postId: string) => void;
  onDelete: (postId: string) => void;
  onEditPost: (postId: string, body: string) => Promise<void>;
  onEditComment: (
    postId: string,
    commentId: string,
    body: string,
  ) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
};

export type FeedCardProps = {
  item: FeedItem;
  actions: FeedCardActions;
  isOwner: boolean;
  viewerUserId?: string;
  viewerAvatarUrl?: string | null;
  viewerReposted?: boolean;
  viewerSent?: boolean;
  commentsExpanded: boolean;
  comments: FeedComment[];
  commentsLoading: boolean;
  onAddComment: (postId: string, body: string) => void;
  isLinkPreviewDismissed: boolean;
  onDismissLinkPreview: () => void;
};

export type PreviewImageSource = 'body_gif' | 'post_attachment';

/**
 * Minimum renderable post criteria: exclude feed items with no displayable
 * content (avoids blank cards with only header + action buttons).
 */
export function hasRenderableContent(item: FeedItem): boolean {
  const snapshot =
    item.kind === 'repost' && item.payload?.snapshot
      ? (item.payload.snapshot as { body?: string; url?: string })
      : null;
  const body =
    (snapshot?.body as string) ||
    (item.payload?.body as string) ||
    (item.payload?.text as string) ||
    '';
  if (typeof body === 'string' && body.trim().length > 0) return true;
  if (item.kind === 'external_link' && item.payload?.url) return true;
  const linkPreview = item.payload?.link_preview;
  if (
    linkPreview &&
    typeof linkPreview === 'object' &&
    (linkPreview as { url?: string }).url
  )
    return true;
  return false;
}

export type LocalFeedDisplayItem = FeedDisplayItem<FeedItem, FeedAdvertiser>;
