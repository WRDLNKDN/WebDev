import AttachFileIcon from '@mui/icons-material/AttachFile';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CampaignIcon from '@mui/icons-material/Campaign';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventIcon from '@mui/icons-material/Event';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import ForumIcon from '@mui/icons-material/Forum';
import GifBoxIcon from '@mui/icons-material/GifBox';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LinkIcon from '@mui/icons-material/Link';
import MessageIcon from '@mui/icons-material/Message';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ThumbDownOffAltOutlinedIcon from '@mui/icons-material/ThumbDownOffAltOutlined';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputBase,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import * as GifPicker from '../../components/chat/dialogs/GifPickerDialog';
import { logFeedAdEvent } from '../../lib/analytics/feedAdEvents';
import { trackEvent } from '../../lib/analytics/trackEvent';
import {
  addComment,
  createFeedPost,
  deleteFeedComment,
  deleteFeedPost,
  editFeedComment,
  editFeedPost,
  fetchComments,
  fetchFeeds,
  removeReaction,
  repostPost,
  saveFeedPost,
  setReaction,
  unsaveFeedPost,
  updateFeedViewPreference,
  type FeedComment,
  type FeedItem,
  type FeedViewPreference,
  type ReactionType,
} from '../../lib/api/feedsApi';
import { consumeSignOutRedirect, signOut } from '../../lib/auth/signOut';
import { supabase } from '../../lib/auth/supabaseClient';
import { ShareToConnectionDialog } from '../../components/feed/ShareToConnectionDialog';
import { ShareToGroupDialog } from '../../components/feed/ShareToGroupDialog';
import { useAppToast } from '../../context/AppToastContext';
import { useFeatureFlag } from '../../context/FeatureFlagsContext';
import { GROUPS_FLAG } from '../../lib/featureFlags/keys';
import { useChatRooms } from '../../hooks/useChatRooms';
import { disconnect } from '../../lib/api/directoryApi';
import { ReportDialog } from '../../components/chat/dialogs/ReportDialog';
import {
  getOrCreateSessionAdSeed,
  interleaveWithAds,
  seededShuffle,
  type FeedDisplayItem,
} from '../../lib/feed/adRotation';
import { shouldLoadMoreForDeepLink } from '../../lib/feed/deepLink';
import {
  createClosedImagePreviewState,
  createOpeningImagePreviewState,
  getWrappedPreviewIndex,
  reduceImagePreviewErrored,
  reduceImagePreviewLoaded,
} from '../../lib/feed/imagePreviewState';
import { formatPostTime } from '../../lib/post/formatPostTime';
import { toMessage } from '../../lib/utils/errors';

import { ProfileAvatar } from '../../components/avatar/ProfileAvatar';
import {
  FeedAdCard,
  type FeedAdvertiser,
} from '../../components/feed/FeedAdCard';
import { FeedCardCommentsSection } from './feedCardCommentsSection';
import { FeedReactionBar, PostCard } from '../../components/post';
import {
  buildFeedReactionSummary,
  getFeedTotalReactionCount,
} from '../../components/post/sharedReactions';
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { INTERACTION_COLORS } from '../../theme/themeConstants';

const FEED_LIMIT = 20;
const FEED_POST_IMAGE_MAX_BYTES = 6 * 1024 * 1024; // 6MB (match chat attachments)
const AD_EVERY_N_POSTS = (() => {
  const raw = Number(import.meta.env.VITE_FEED_AD_EVERY_N_POSTS ?? 6);
  const value = Math.floor(raw);
  return Number.isFinite(value) && value > 0 ? value : 6;
})();
const AD_IMPRESSION_CAP_PER_SESSION = (() => {
  const raw = Number(import.meta.env.VITE_FEED_AD_IMPRESSION_CAP ?? 12);
  const value = Math.floor(raw);
  return Number.isFinite(value) && value > 0 ? value : 12;
})();
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const FEED_CACHE_KEY_PREFIX = 'feed_cache_v1';
const ADVERTISERS_UPDATED_EVENT_KEY = 'feed_advertisers_updated_at';
const FEED_ACTION_MUTED_COLOR = 'rgba(255,255,255,0.65)';
const FEED_ACTION_ACTIVE_COLOR = INTERACTION_COLORS.focus;
const FEED_ACTION_SELECTED_TEXT_SX = { fontWeight: 700 } as const;
const FEED_ACTION_BUTTON_SX = {
  textTransform: 'none',
  minWidth: 0,
  minHeight: { xs: 40, sm: 36 },
  flexDirection: { xs: 'row', sm: 'row' },
  gap: 0.625,
  py: { xs: 0.6, sm: 0.45 },
  px: { xs: 0.85, sm: 0.75 },
  borderRadius: 2,
  boxSizing: 'border-box',
  border: '1px solid transparent',
  transition:
    'color 120ms ease, background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
  color: FEED_ACTION_MUTED_COLOR,
  backgroundColor: 'transparent',
  lineHeight: 1,
  '& .MuiButton-startIcon': {
    margin: 0,
  },
  '& .MuiTouchRipple-root': {
    display: 'none',
  },
  '& .MuiSvgIcon-root, & .MuiTypography-root': {
    color: 'inherit',
  },
  '& .MuiSvgIcon-root': {
    flexShrink: 0,
  },
  '& .MuiTypography-root': {
    fontWeight: 600,
    lineHeight: 1.1,
  },
  '&:focus-visible': {
    outline: 'none',
    borderColor: 'rgba(141,188,229,0.32)',
    boxShadow: '0 0 0 1px rgba(56,132,210,0.14) inset',
  },
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      bgcolor: 'rgba(56,132,210,0.08)',
      borderColor: 'rgba(141,188,229,0.22)',
      color: FEED_ACTION_ACTIVE_COLOR,
    },
  },
} as const;

const getActiveActionSx = (active: boolean) => ({
  color: active ? FEED_ACTION_ACTIVE_COLOR : FEED_ACTION_MUTED_COLOR,
  bgcolor: active ? 'rgba(56,132,210,0.12)' : 'transparent',
  borderColor: active ? 'rgba(141,188,229,0.3)' : 'transparent',
  boxShadow: active ? '0 0 0 1px rgba(56,132,210,0.08) inset' : 'none',
  ...(active
    ? {
        '& .MuiTypography-root': FEED_ACTION_SELECTED_TEXT_SX,
      }
    : null),
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      bgcolor: active ? 'rgba(56,132,210,0.16)' : 'rgba(56,132,210,0.08)',
      borderColor: active ? 'rgba(141,188,229,0.34)' : 'rgba(141,188,229,0.22)',
      color: FEED_ACTION_ACTIVE_COLOR,
    },
  },
});

type FeedCachePayload = {
  items: FeedItem[];
  nextCursor?: string;
  advertisers: FeedAdvertiser[];
  cachedAt: number;
};

/** Match URLs so we can render them as clickable links in post body. */
const URL_REGEX = /https?:\/\/[^\s<>[\]()]+(?:\([^\s)]*\)|[^\s<>[\]()]*)?/gi;

function linkifyBody(body: string): ReactNode {
  if (!body.trim()) return null;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_REGEX.source, 'gi');
  while ((m = re.exec(body)) !== null) {
    if (m.index > lastIndex) {
      parts.push(body.slice(lastIndex, m.index));
    }
    parts.push(
      <Link
        key={m.index}
        href={m[0]}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: 'primary.main' }}
      >
        {m[0]}
      </Link>,
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

function extractBodyUrls(body: string): string[] {
  if (!body.trim()) return [];
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_REGEX.source, 'gi');
  while ((m = re.exec(body)) !== null) {
    urls.push(m[0]);
  }
  return urls;
}

function isGifUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (/\.gif($|\?)/i.test(parsed.pathname + parsed.search)) return true;
    const h = parsed.hostname.toLowerCase();
    return (
      h.includes('tenor.com') ||
      h.includes('giphy.com') ||
      h.includes('media.giphy.com')
    );
  } catch {
    return false;
  }
}

function removeGifUrlsFromBody(body: string): string {
  if (!body.trim()) return '';
  const gifUrls = extractBodyUrls(body).filter(isGifUrl);
  if (gifUrls.length === 0) return body;

  let cleaned = body;
  for (const url of gifUrls) {
    cleaned = cleaned.split(url).join('');
  }
  return cleaned
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
]);

function fileExtension(fileName: string): string {
  const ext = fileName.split('.').pop();
  return (ext ?? '').toLowerCase();
}

function isSupportedImageFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (SUPPORTED_IMAGE_MIME_TYPES.has(mime)) return true;
  return SUPPORTED_IMAGE_EXTENSIONS.has(fileExtension(file.name));
}

type LinkPreviewPayload = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

function linkPreviewDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const LinkPreviewCard = ({
  preview,
  onDismiss,
}: {
  preview: LinkPreviewPayload;
  onDismiss?: () => void;
}) => (
  <Box sx={{ position: 'relative', display: 'block', mt: 1.5 }}>
    {onDismiss && (
      <IconButton
        size="small"
        aria-label="Dismiss link preview"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss();
        }}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          bgcolor: 'background.paper',
          boxShadow: 1,
          '&:hover': { bgcolor: 'action.hover' },
          '&:focus': { bgcolor: 'background.paper' },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    )}
    <Link
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      underline="none"
      sx={{ display: 'block' }}
    >
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          overflow: 'hidden',
          borderRadius: 1.5,
          borderColor: 'divider',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        {preview.image && (
          <Box
            component="img"
            src={preview.image}
            alt=""
            sx={{
              width: { xs: '100%', sm: 120 },
              minWidth: { sm: 120 },
              height: { xs: 140, sm: 120 },
              objectFit: 'cover',
              bgcolor: 'action.hover',
            }}
          />
        )}
        <Box sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{
              color: 'text.primary',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {preview.title || linkPreviewDomain(preview.url)}
          </Typography>
          {preview.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.25,
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              {preview.description}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: 'block' }}
          >
            {preview.siteName || linkPreviewDomain(preview.url)}
          </Typography>
        </Box>
      </Paper>
    </Link>
  </Box>
);

type FeedCardActions = {
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
  onRepost: (item: FeedItem, event?: React.MouseEvent) => void;
  onSend: (item: FeedItem) => void;
  onSave: (postId: string) => void;
  onUnsave: (postId: string) => void;
  onCopyLink: (url: string) => void;
  onUnfollow: (userId: string) => void;
  onNotInterested: (postId: string) => void;
  onReport: (postId: string, userId?: string) => void;
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

type FeedCardProps = {
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

type PreviewImageSource = 'body_gif' | 'post_attachment';

/**
 * Minimum renderable post criteria: exclude feed items with no displayable
 * content (avoids blank cards with only header + action buttons).
 */
function hasRenderableContent(item: FeedItem): boolean {
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

type LocalFeedDisplayItem = FeedDisplayItem<FeedItem, FeedAdvertiser>;

const ShareDialog = ({
  item,
  open,
  onClose,
  onCopyLink,
  onComplete,
  mobile,
  onOpenShareToConnection,
  onOpenShareToGroup,
  chatEnabled,
}: {
  item: FeedItem | null;
  open: boolean;
  onClose: () => void;
  onCopyLink: (url: string) => void;
  onComplete?: () => void;
  mobile: boolean;
  onOpenShareToConnection: () => void;
  onOpenShareToGroup: () => void;
  chatEnabled: boolean;
}) => {
  if (!item) return null;
  const postUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/feed?post=${encodeURIComponent(item.id)}`
      : '';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={mobile}
      PaperProps={{
        sx: mobile
          ? {
              m: 0,
              width: '100%',
              maxWidth: '100%',
              minHeight: '42vh',
              borderRadius: '20px 20px 0 0',
              alignSelf: 'flex-end',
            }
          : undefined,
      }}
    >
      <DialogTitle>Share this post</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              onCopyLink(postUrl);
              onComplete?.();
              onClose();
            }}
          >
            Copy link
          </Button>
          {chatEnabled && (
            <>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<MessageIcon />}
                onClick={() => {
                  onOpenShareToConnection();
                }}
              >
                Share to Connection
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ForumIcon />}
                onClick={() => {
                  onOpenShareToGroup();
                }}
              >
                Share to Group
              </Button>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

const RepostEmbed = ({
  originalAvatarUrl,
  originalHandle,
  originalName,
  originalBody,
  originalCreatedAt,
  repostOriginalId,
}: {
  originalAvatarUrl?: string | null;
  originalHandle: string | null;
  originalName: string | null;
  originalBody: string;
  originalCreatedAt?: string | null;
  repostOriginalId: string | null;
}) => {
  const displayName = originalName || originalHandle || 'Original member';
  const hasBody = Boolean(originalBody.trim());

  return (
    <Box
      sx={{
        mt: 1.35,
        borderRadius: 2.25,
        border: '1px solid rgba(156,187,217,0.26)',
        bgcolor: 'rgba(7,12,21,0.7)',
        boxShadow: '0 0 0 1px rgba(56,132,210,0.04) inset',
        px: { xs: 1.15, sm: 1.35 },
        py: { xs: 1.1, sm: 1.25 },
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{ mb: 0.95, color: 'text.secondary' }}
      >
        <RepeatOutlinedIcon sx={{ fontSize: 16, color: 'primary.light' }} />
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.76rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'primary.light',
          }}
        >
          Original Post
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="flex-start">
        <ProfileAvatar
          src={originalAvatarUrl ?? undefined}
          alt={displayName}
          size="small"
          component={originalHandle ? RouterLink : 'div'}
          to={originalHandle ? `/profile/${originalHandle}` : undefined}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexWrap="wrap"
          >
            {originalHandle ? (
              <Typography
                component={RouterLink}
                to={`/profile/${originalHandle}`}
                variant="body2"
                sx={{
                  color: 'text.primary',
                  textDecoration: 'none',
                  fontWeight: 700,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {displayName}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {displayName}
              </Typography>
            )}
            {originalCreatedAt ? (
              <Typography variant="caption" color="text.secondary">
                • {formatPostTime(originalCreatedAt)}
              </Typography>
            ) : null}
          </Stack>

          {hasBody ? (
            <Typography
              variant="body2"
              component="div"
              sx={{
                mt: 0.7,
                color: 'text.primary',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              {linkifyBody(originalBody)}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7 }}>
              Original post content unavailable.
            </Typography>
          )}

          {repostOriginalId ? (
            <Typography
              component={RouterLink}
              to={`/feed?post=${encodeURIComponent(repostOriginalId)}`}
              variant="caption"
              sx={{
                mt: 0.95,
                display: 'inline-flex',
                color: 'primary.light',
                textDecoration: 'none',
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              View original post
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
};

const FeedCard = ({
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
  const [imagePreviewState, setImagePreviewState] = useState(
    createClosedImagePreviewState,
  );
  const imageTouchStartXRef = useRef<number | null>(null);
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
  const reactionCounts = {
    like_count: likeCount,
    love_count: loveCount,
    inspiration_count: inspirationCount,
    care_count: careCount,
    laughing_count: laughingCount,
    rage_count: rageCount,
  };
  const totalReactions = getFeedTotalReactionCount(
    reactionCounts,
    viewerReaction,
  );
  const reactionSummary = buildFeedReactionSummary(
    reactionCounts,
    viewerReaction,
  ).map((reaction) => ({
    type: reaction.value,
    emoji: reaction.emoji,
    color: reaction.color,
  }));
  const isPostEdited = Boolean(item.edited_at);
  const imageLightboxUrl = imagePreviewState.url;
  const actorAvatar =
    viewerUserId && item.user_id === viewerUserId
      ? (viewerAvatarUrl ?? (item.actor?.avatar as string) ?? null)
      : ((item.actor?.avatar as string) ?? null);
  const currentPreviewIndex = useMemo(
    () =>
      imageLightboxUrl
        ? previewableImages.findIndex((img) => img.url === imageLightboxUrl)
        : -1,
    [imageLightboxUrl, previewableImages],
  );

  const openImageLightbox = useCallback(
    (
      urlToOpen: string,
      source: PreviewImageSource,
      trackAction: 'open' | 'navigate' = 'open',
    ) => {
      setImagePreviewState(createOpeningImagePreviewState(urlToOpen));
      if (trackAction === 'open') {
        trackEvent('feed_image_preview_opened', {
          source: 'feed',
          post_id: item.id,
          media_source: source,
          media_url: urlToOpen,
        });
      }
    },
    [item.id],
  );

  const openImageByIndex = useCallback(
    (index: number) => {
      const next = previewableImages[index];
      if (!next) return;
      openImageLightbox(next.url, next.source, 'navigate');
    },
    [openImageLightbox, previewableImages],
  );

  const handlePreviewPrevious = useCallback(() => {
    if (previewableImages.length <= 1 || currentPreviewIndex < 0) return;
    const nextIndex = getWrappedPreviewIndex(
      currentPreviewIndex,
      'previous',
      previewableImages.length,
    );
    if (nextIndex < 0) return;
    openImageByIndex(nextIndex);
  }, [currentPreviewIndex, openImageByIndex, previewableImages.length]);

  const handlePreviewNext = useCallback(() => {
    if (previewableImages.length <= 1 || currentPreviewIndex < 0) return;
    const nextIndex = getWrappedPreviewIndex(
      currentPreviewIndex,
      'next',
      previewableImages.length,
    );
    if (nextIndex < 0) return;
    openImageByIndex(nextIndex);
  }, [currentPreviewIndex, openImageByIndex, previewableImages.length]);

  const closeImageLightbox = useCallback(() => {
    if (imageLightboxUrl) {
      trackEvent('feed_image_preview_closed', {
        source: 'feed',
        post_id: item.id,
        media_url: imageLightboxUrl,
      });
    }
    setImagePreviewState(createClosedImagePreviewState());
  }, [imageLightboxUrl, item.id]);

  useEffect(() => {
    if (!imageLightboxUrl) return;
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;
    const prevBodyOverscrollBehavior = body.style.overscrollBehavior;
    const prevHtmlOverscrollBehavior = documentElement.style.overscrollBehavior;
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    body.style.overscrollBehavior = 'none';
    documentElement.style.overscrollBehavior = 'none';
    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouchAction;
      body.style.overscrollBehavior = prevBodyOverscrollBehavior;
      documentElement.style.overscrollBehavior = prevHtmlOverscrollBehavior;
    };
  }, [imageLightboxUrl]);

  useEffect(() => {
    if (!imageLightboxUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePreviewPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handlePreviewNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePreviewNext, handlePreviewPrevious, imageLightboxUrl]);

  const handleReaction = (type: ReactionType) => {
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
          type === 'laughing' ? Math.max(0, laughingCount - 1) : laughingCount,
        rage_count: type === 'rage' ? Math.max(0, rageCount - 1) : rageCount,
      });
    } else {
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
    }
  };

  const handleAddComment = async () => {
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
  };

  const handleSavePostEdit = async () => {
    const nextBody = editPostDraft.trim();
    if (!nextBody || savingPostEdit) return;
    setSavingPostEdit(true);
    try {
      await actions.onEditPost(item.id, nextBody);
      actions.updateItem(item.id, {
        payload: {
          ...(item.payload ?? {}),
          body: nextBody,
        },
        edited_at: new Date().toISOString(),
      });
      setIsEditingPost(false);
    } finally {
      setSavingPostEdit(false);
    }
  };

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
              <Stack
                direction="row"
                spacing={0.55}
                alignItems="center"
                sx={{ mt: 0.4 }}
              >
                <RepeatOutlinedIcon
                  sx={{ fontSize: 15, color: 'primary.light' }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: 'primary.light',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                >
                  Reposted from
                </Typography>
                {repostOriginalHandle ? (
                  <Typography
                    component={RouterLink}
                    to={`/profile/${repostOriginalHandle}`}
                    variant="caption"
                    sx={{
                      color: 'text.primary',
                      textDecoration: 'underline',
                      '&:hover': { color: 'text.primary' },
                    }}
                  >
                    {repostOriginalName || `@${repostOriginalHandle}`}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    original member
                  </Typography>
                )}
                {repostOriginalId && (
                  <Typography
                    component={RouterLink}
                    to={`/feed?post=${encodeURIComponent(repostOriginalId)}`}
                    variant="caption"
                    sx={{
                      color: 'primary.light',
                      textDecoration: 'underline',
                      '&:hover': { color: 'text.primary' },
                    }}
                  >
                    original post
                  </Typography>
                )}
              </Stack>
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
            ...(!isOwner && handle && item.user_id
              ? [
                  {
                    label: `Unfollow ${displayName}`,
                    icon: <PersonOffOutlinedIcon fontSize="small" />,
                    onClick: () => actions.onUnfollow(item.user_id),
                  },
                ]
              : []),
            ...(!isOwner
              ? [
                  {
                    label: 'Not interested',
                    icon: <ThumbDownOffAltOutlinedIcon fontSize="small" />,
                    onClick: () => actions.onNotInterested(item.id),
                  },
                  {
                    label: 'Report post',
                    icon: <FlagOutlinedIcon fontSize="small" />,
                    onClick: () => actions.onReport(item.id, item.user_id),
                    danger: true,
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
        {isEditingPost ? (
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField
              value={editPostDraft}
              onChange={(e) => setEditPostDraft(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                onClick={() => void handleSavePostEdit()}
                disabled={!editPostDraft.trim() || savingPostEdit}
              >
                Save
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setIsEditingPost(false);
                  setEditPostDraft(body);
                }}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        ) : (
          (bodyTextWithoutGifUrls || bodyGifUrls.length > 0) && (
            <>
              {bodyTextWithoutGifUrls && (
                <Typography
                  variant="body1"
                  component="span"
                  sx={{
                    mt: 0.5,
                    whiteSpace: 'pre-wrap',
                    display: 'block',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                >
                  {linkifyBody(bodyTextWithoutGifUrls)}
                </Typography>
              )}
              {bodyGifUrls.map((gifUrl) => (
                <Box
                  key={gifUrl}
                  component="img"
                  src={gifUrl}
                  alt=""
                  loading="lazy"
                  onClick={() => openImageLightbox(gifUrl, 'body_gif')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openImageLightbox(gifUrl, 'body_gif');
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="View image full screen"
                  sx={{
                    mt: 1,
                    maxWidth: 320,
                    width: '100%',
                    maxHeight: 320,
                    objectFit: 'contain',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'zoom-in',
                  }}
                />
              ))}
            </>
          )
        )}
        {linkPreview?.url && !isLinkPreviewDismissed && (
          <LinkPreviewCard
            preview={linkPreview}
            onDismiss={onDismissLinkPreview}
          />
        )}
        {postAttachmentImages.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }} flexWrap="wrap">
            {postAttachmentImages.map((imgUrl) => (
              <Box
                key={imgUrl}
                component="img"
                src={imgUrl}
                alt=""
                onClick={() => openImageLightbox(imgUrl, 'post_attachment')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openImageLightbox(imgUrl, 'post_attachment');
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label="View image full screen"
                sx={{
                  maxWidth: 280,
                  maxHeight: 280,
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'zoom-in',
                }}
              />
            ))}
          </Stack>
        )}
        {url && (
          <Typography
            variant="body2"
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mt: 0.5, color: 'primary.main', display: 'block' }}
          >
            {label || url}
          </Typography>
        )}
        {item.kind === 'repost' ? (
          <RepostEmbed
            originalAvatarUrl={(snapshot?.actor_avatar as string) ?? null}
            originalHandle={repostOriginalHandle}
            originalName={repostOriginalName}
            originalBody={repostOriginalBody}
            originalCreatedAt={(snapshot?.created_at as string) ?? null}
            repostOriginalId={repostOriginalId}
          />
        ) : null}
        {/* Engagement row: reaction summary + comment count above actions */}
        {(totalReactions > 0 || commentCount > 0) && (
          <Box
            sx={{
              mt: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            {totalReactions > 0 && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Stack
                  direction="row"
                  alignItems="center"
                  sx={{ '& > *:not(:first-of-type)': { ml: -0.55 } }}
                >
                  {reactionSummary.map(({ type, emoji, color }) => (
                    <Box
                      key={type}
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(12,18,29,0.92)',
                        border: '1px solid rgba(156,187,217,0.26)',
                        color,
                        fontSize: '0.72rem',
                      }}
                    >
                      <span aria-hidden="true">{emoji}</span>
                    </Box>
                  ))}
                </Stack>
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    cursor: 'default',
                  }}
                >
                  {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
                </Typography>
              </Stack>
            )}
            {commentCount > 0 && (
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  cursor: 'default',
                }}
              >
                {commentCount} comment{commentCount !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
        )}
        {/* Post action bar: React | Comment | Repost | Send | Save — left-aligned, colored rollovers */}
        <Box
          sx={{
            mt: 2.15,
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-start',
            columnGap: 2.5,
            rowGap: 0.5,
            borderTop: 1,
            borderColor: 'divider',
            pt: 1,
            pb: 0.75,
            '& > *': {
              minHeight: { xs: 40, sm: 36 },
              display: 'flex',
              alignItems: 'center',
            },
          }}
        >
          <FeedReactionBar
            viewerReaction={viewerReaction}
            likeCount={likeCount}
            loveCount={loveCount}
            inspirationCount={inspirationCount}
            careCount={careCount}
            laughingCount={laughingCount}
            rageCount={rageCount}
            onReaction={handleReaction}
            onRemoveReaction={() =>
              actions.onRemoveReaction(
                item.id,
                item.viewer_reaction ?? undefined,
              )
            }
            sx={{}}
          />
          <Button
            size="small"
            onClick={() => actions.onCommentToggle(item.id)}
            sx={{
              ...FEED_ACTION_BUTTON_SX,
              ...getActiveActionSx(commentsExpanded),
            }}
            aria-pressed={commentsExpanded}
          >
            <ChatBubbleOutlineOutlinedIcon
              sx={{ fontSize: { xs: 22, sm: 20 } }}
            />
            <Typography
              component="span"
              variant="caption"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
            >
              Comment
            </Typography>
          </Button>
          <Tooltip
            title={viewerReposted ? "You've already reposted this" : ''}
            disableHoverListener={!viewerReposted}
          >
            <span>
              <Button
                size="small"
                onClick={(e) => {
                  if (viewerReposted) return;
                  actions.onRepost(item, e);
                }}
                disabled={viewerReposted}
                sx={{
                  ...FEED_ACTION_BUTTON_SX,
                  ...getActiveActionSx(viewerReposted),
                }}
                aria-pressed={viewerReposted}
                aria-label={
                  viewerReposted ? "You've already reposted this" : 'Repost'
                }
              >
                <RepeatOutlinedIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                >
                  {viewerReposted ? 'Reposted' : 'Repost'}
                </Typography>
              </Button>
            </span>
          </Tooltip>
          <Button
            size="small"
            onClick={() => actions.onSend(item)}
            sx={{
              ...FEED_ACTION_BUTTON_SX,
              ...getActiveActionSx(viewerSent),
            }}
            aria-pressed={viewerSent}
          >
            <SendOutlinedIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
            <Typography
              component="span"
              variant="caption"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
            >
              {viewerSent ? 'Sent' : 'Send'}
            </Typography>
          </Button>
          <Button
            size="small"
            onClick={() =>
              item.viewer_saved
                ? actions.onUnsave(item.id)
                : actions.onSave(item.id)
            }
            sx={{
              ...FEED_ACTION_BUTTON_SX,
              ...getActiveActionSx(Boolean(item.viewer_saved)),
            }}
            aria-label={item.viewer_saved ? 'Unsave' : 'Save'}
            aria-pressed={item.viewer_saved}
          >
            {item.viewer_saved ? (
              <BookmarkIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
            ) : (
              <BookmarkBorderIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
            )}
            <Typography
              component="span"
              variant="caption"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
            >
              {item.viewer_saved ? 'Saved' : 'Save'}
            </Typography>
          </Button>
        </Box>
        {commentsExpanded && (
          <Box sx={{ mt: 2, pl: 0 }}>
            {commentsLoading ? (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ py: 1 }}
              >
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading comments…
                </Typography>
              </Stack>
            ) : (
              <FeedCardCommentsSection
                commentsExpanded={commentsExpanded}
                commentsLoading={commentsLoading}
                comments={comments}
                itemId={item.id}
                viewerUserId={viewerUserId}
                viewerAvatarUrl={viewerAvatarUrl}
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
            )}
          </Box>
        )}
      </PostCard>
      <Dialog
        open={Boolean(imageLightboxUrl)}
        onClose={closeImageLightbox}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
          Image preview
          <Box sx={{ flex: 1 }} />
          <IconButton
            edge="end"
            onClick={closeImageLightbox}
            aria-label="Close image preview"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            p: { xs: 1, sm: 2 },
          }}
        >
          {imageLightboxUrl ? (
            <Box
              sx={{
                width: '100%',
                minHeight: 160,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
              onTouchStart={(event) => {
                imageTouchStartXRef.current = event.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                if (previewableImages.length <= 1) return;
                const startX = imageTouchStartXRef.current;
                const endX = event.changedTouches[0]?.clientX ?? null;
                imageTouchStartXRef.current = null;
                if (startX === null || endX === null) return;
                const deltaX = startX - endX;
                if (Math.abs(deltaX) < 40) return;
                if (deltaX > 0) {
                  handlePreviewNext();
                } else {
                  handlePreviewPrevious();
                }
              }}
            >
              {previewableImages.length > 1 && (
                <>
                  <IconButton
                    onClick={handlePreviewPrevious}
                    aria-label="Previous image"
                    sx={{ position: 'absolute', left: 8, zIndex: 1 }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <IconButton
                    onClick={handlePreviewNext}
                    aria-label="Next image"
                    sx={{ position: 'absolute', right: 8, zIndex: 1 }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </>
              )}
              {imagePreviewState.error ? (
                <Typography variant="body2" color="text.secondary">
                  Unable to load image preview.
                </Typography>
              ) : (
                <>
                  {imagePreviewState.loading && <CircularProgress size={28} />}
                  <Box
                    component="img"
                    src={imageLightboxUrl}
                    alt="Full-screen post image"
                    onLoad={() =>
                      setImagePreviewState((prev) =>
                        reduceImagePreviewLoaded(prev),
                      )
                    }
                    onError={() =>
                      setImagePreviewState((prev) =>
                        reduceImagePreviewErrored(prev),
                      )
                    }
                    sx={{
                      display: imagePreviewState.loading ? 'none' : 'block',
                      maxWidth: '100%',
                      maxHeight: '80vh',
                      objectFit: 'contain',
                      borderRadius: 1,
                    }}
                  />
                </>
              )}
            </Box>
          ) : null}
          {imageLightboxUrl && (
            <Button
              component="a"
              href={imageLightboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="text"
              startIcon={<OpenInNewIcon />}
              sx={{ position: 'absolute', bottom: 4, left: 8, minWidth: 0 }}
            >
              Open original
            </Button>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {currentPreviewIndex >= 0 ? currentPreviewIndex + 1 : 0}/
            {previewableImages.length || 0}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ position: 'absolute', bottom: 8, right: 12 }}
          >
            Press Esc to close
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

type FeedProps = { savedMode?: boolean };

export const Feed = ({ savedMode = false }: FeedProps) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const postParam = searchParams.get('post');
  const eventsEnabled = useFeatureFlag('events');
  const chatEnabled = useFeatureFlag('chat');
  const groupsEnabled = useFeatureFlag(GROUPS_FLAG);
  const gamesEnabled = useFeatureFlag('games');
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const itemsRef = useRef<FeedItem[]>([]);
  const [advertisers, setAdvertisers] = useState<FeedAdvertiser[]>([]);
  const [dismissedAdIds, setDismissedAdIds] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem('feed_dismissed_ad_ids');
      return s ? new Set(JSON.parse(s) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [showInitialFeedLoader, setShowInitialFeedLoader] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [composerImages, setComposerImages] = useState<string[]>([]);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [composerScheduledAt, setComposerScheduledAt] = useState<string | null>(
    null,
  );
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [scheduleTime, setScheduleTime] = useState('09:30');
  type SortOption = 'recent' | 'oldest';

  const SCHEDULE_TIMES = (() => {
    const times: string[] = [];
    for (let h = 6; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        times.push(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        );
      }
    }
    return times;
  })();
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const adImpressionStorageKey = useMemo(
    () => `feed_ad_impressions:${session?.user?.id ?? 'anon'}`,
    [session?.user?.id],
  );
  const [adImpressionCounts, setAdImpressionCounts] = useState<
    Record<string, number>
  >({});
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem('feed_hidden_post_ids');
      return s ? new Set(JSON.parse(s) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    postId: string;
    userId?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(adImpressionStorageKey);
      if (!raw) {
        setAdImpressionCounts({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const sanitized: Record<string, number> = {};
      Object.entries(parsed).forEach(([key, value]) => {
        const n = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(n) && n > 0) sanitized[key] = Math.floor(n);
      });
      setAdImpressionCounts(sanitized);
    } catch {
      setAdImpressionCounts({});
    }
  }, [adImpressionStorageKey]);
  const sortedItems = useMemo(() => {
    let list = items.filter((item) => !hiddenPostIds.has(item.id));
    if (sortBy === 'oldest')
      list = [...list].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    return list;
  }, [items, sortBy, hiddenPostIds]);
  const visibleAdvertisers = useMemo(
    () =>
      advertisers.filter((a) => {
        if (dismissedAdIds.has(a.id)) return false;
        return (adImpressionCounts[a.id] ?? 0) < AD_IMPRESSION_CAP_PER_SESSION;
      }),
    [advertisers, dismissedAdIds, adImpressionCounts],
  );
  const adSeed = useMemo(
    () => getOrCreateSessionAdSeed(session?.user?.id ?? null),
    [session?.user?.id],
  );
  const shuffledAdvertisers = useMemo(
    () => seededShuffle(visibleAdvertisers, adSeed),
    [visibleAdvertisers, adSeed],
  );
  const displayItems: LocalFeedDisplayItem[] = useMemo(
    () =>
      savedMode
        ? sortedItems.map((item) => ({ kind: 'post' as const, item }))
        : interleaveWithAds(
            sortedItems,
            shuffledAdvertisers,
            AD_EVERY_N_POSTS,
            hasRenderableContent,
          ),
    [savedMode, sortedItems, shuffledAdvertisers],
  );

  const handleDismissAd = useCallback((adId: string) => {
    setDismissedAdIds((prev) => {
      const next = new Set(prev).add(adId);
      try {
        localStorage.setItem(
          'feed_dismissed_ad_ids',
          JSON.stringify([...next]),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const handleAdImpression = useCallback(
    (advertiser: FeedAdvertiser, slotIndex: number) => {
      setAdImpressionCounts((prev) => {
        const nextCount = (prev[advertiser.id] ?? 0) + 1;
        const next = { ...prev, [advertiser.id]: nextCount };
        try {
          sessionStorage.setItem(adImpressionStorageKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });

      trackEvent('feed_ad_impression', {
        source: 'feed',
        ad_id: advertiser.id,
        advertiser_name: advertiser.company_name,
        slot_index: slotIndex,
      });
      const adSource = (advertiser as FeedAdvertiser & { adSource?: string })
        .adSource;
      if (adSource !== 'partner') {
        void logFeedAdEvent({
          advertiserId: advertiser.id,
          memberId: session?.user?.id ?? null,
          eventName: 'feed_ad_impression',
          slotIndex,
          pagePath:
            typeof window !== 'undefined' ? window.location.pathname : null,
        });
      }
    },
    [adImpressionStorageKey, session?.user?.id],
  );
  const handleAdClick = useCallback(
    (
      advertiser: FeedAdvertiser,
      slotIndex: number,
      payload: { target: string; url: string },
    ) => {
      trackEvent('feed_ad_click', {
        source: 'feed',
        ad_id: advertiser.id,
        advertiser_name: advertiser.company_name,
        slot_index: slotIndex,
        target: payload.target,
        url: payload.url,
      });
      const adSource = (advertiser as FeedAdvertiser & { adSource?: string })
        .adSource;
      if (adSource !== 'partner') {
        void logFeedAdEvent({
          advertiserId: advertiser.id,
          memberId: session?.user?.id ?? null,
          eventName: 'feed_ad_click',
          slotIndex,
          target: payload.target,
          url: payload.url,
          pagePath:
            typeof window !== 'undefined' ? window.location.pathname : null,
        });
      }
    },
    [session?.user?.id],
  );
  const composerRef = useRef<HTMLInputElement>(null);
  const [posting, setPosting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<
    string | null
  >(null);
  const [commentsByPostId, setCommentsByPostId] = useState<
    Record<string, FeedComment[]>
  >({});
  const [commentsLoadingPostId, setCommentsLoadingPostId] = useState<
    string | null
  >(null);
  const [shareModalItem, setShareModalItem] = useState<FeedItem | null>(null);
  const [shareSubDialog, setShareSubDialog] = useState<
    null | 'connection' | 'group'
  >(null);
  const { rooms: chatRooms, createDm } = useChatRooms();
  const [repostedOriginalIds, setRepostedOriginalIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [sentPostIds, setSentPostIds] = useState<Set<string>>(() => new Set());
  const [composerOpen, setComposerOpen] = useState(false);
  const [repostMenuAnchor, setRepostMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [repostMenuTarget, setRepostMenuTarget] = useState<FeedItem | null>(
    null,
  );
  const [repostWithCommentTarget, setRepostWithCommentTarget] =
    useState<FeedItem | null>(null);
  const [repostCommentDraft, setRepostCommentDraft] = useState('');
  const [repostCommentDialogOpen, setRepostCommentDialogOpen] = useState(false);
  const [repostCommentSubmitting, setRepostCommentSubmitting] = useState(false);
  const [dismissedLinkPreviewIds, setDismissedLinkPreviewIds] = useState<
    Set<string>
  >(new Set());

  const [feedViewPreference, setFeedViewPreference] =
    useState<FeedViewPreference>('anyone');
  const { avatarUrl } = useCurrentUserAvatar();
  const { showToast } = useAppToast();
  const feedCacheKey = useMemo(
    () =>
      session?.user?.id
        ? `${FEED_CACHE_KEY_PREFIX}:${session.user.id}${savedMode ? ':saved' : ''}`
        : null,
    [session?.user?.id, savedMode],
  );

  const handleDismissLinkPreview = useCallback((postId: string) => {
    setDismissedLinkPreviewIds((prev) => new Set(prev).add(postId));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<FeedItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const reposted = new Set<string>();
    for (const item of items) {
      if (
        item.kind === 'repost' &&
        item.user_id === session.user.id &&
        typeof item.payload?.original_id === 'string'
      ) {
        reposted.add(item.payload.original_id);
      }
    }
    setRepostedOriginalIds(reposted);
  }, [items, session?.user?.id]);

  useEffect(() => {
    const joinComplete = searchParams.get('join') === 'complete';
    const legacySignupComplete = searchParams.get('signup') === 'complete';
    if (!joinComplete && !legacySignupComplete) return;
    trackEvent('join_completed_landed_feed', {
      source: joinComplete ? 'join_wizard' : 'legacy_signup_wizard',
    });
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('join');
    nextParams.delete('signup');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleAuthError = useCallback(
    async (error: unknown, fallback: string) => {
      const raw = error instanceof Error ? error.message : String(error ?? '');
      const lower = raw.toLowerCase();

      // Only redirect to /join if this is a REAL Supabase auth error
      // Not just any 401 from browser/infrastructure requests
      const isSupabaseAuthError =
        (lower.includes('jwt') && lower.includes('expired')) ||
        lower.includes('refresh token') ||
        lower.includes('invalid claim') ||
        (lower.includes('not signed in') && lower.includes('supabase'));

      if (isSupabaseAuthError) {
        console.warn('🔴 Feed: Supabase auth error, signing out:', raw);
        try {
          await signOut();
        } catch {
          // ignore sign-out failures here
        }
        navigate('/join', { replace: true });
      } else {
        // Just show error, don't redirect
        console.warn('⚠️ Feed: API error (not redirecting):', raw);
        showToast({
          message: toMessage(error) || fallback,
          severity: 'error',
        });
      }
    },
    [navigate, showToast],
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session?.access_token) {
        setSession(null);
        return;
      }
      setSession(data.session);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evt, newSession) => {
      if (cancelled) return;

      // Only redirect on explicit sign-out, not on token refresh/errors
      if (evt === 'SIGNED_OUT') {
        // UAT hardening: transient SIGNED_OUT events can happen during token
        // refresh churn. Re-verify before redirecting.
        void (async () => {
          const { data: current } = await supabase.auth.getSession();
          if (cancelled) return;
          if (current.session) {
            setSession(current.session);
            return;
          }
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (cancelled) return;
          if (refreshed.session) {
            setSession(refreshed.session);
            return;
          }
          setSession(null);
          navigate(consumeSignOutRedirect() ?? '/join', { replace: true });
        })();
        return;
      }

      // Update session if we have one
      if (newSession) {
        setSession(newSession);
      }
      // If no session but not signed out, do nothing (token refresh in progress)
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const loadPage = useCallback(
    async (cursor?: string, append = false) => {
      if (!session?.access_token) return;
      const showInitialLoader = !append && itemsRef.current.length === 0;
      try {
        if (append) setLoadingMore(true);
        else if (showInitialLoader) setLoading(true);
        const res = await fetchFeeds({
          limit: FEED_LIMIT,
          cursor,
          saved: savedMode,
          accessToken: session.access_token,
        });
        if (append) {
          setItems((prev) => [...prev, ...res.data]);
        } else {
          setItems(res.data);
        }
        setNextCursor(res.nextCursor);
      } catch (e) {
        await handleAuthError(
          e,
          savedMode ? 'Failed to load saved posts' : 'Failed to load feed',
        );
      } finally {
        if (showInitialLoader) setLoading(false);
        setLoadingMore(false);
      }
    },
    [handleAuthError, session?.access_token, savedMode],
  );

  useEffect(() => {
    if (!feedCacheKey) return;
    try {
      const raw = sessionStorage.getItem(feedCacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FeedCachePayload;
      if (
        !parsed ||
        !Array.isArray(parsed.items) ||
        !Array.isArray(parsed.advertisers) ||
        typeof parsed.cachedAt !== 'number'
      ) {
        return;
      }
      if (Date.now() - parsed.cachedAt > FEED_CACHE_TTL_MS) return;
      setItems(parsed.items);
      setNextCursor(parsed.nextCursor);
      setAdvertisers(parsed.advertisers);
      setLoading(false);
    } catch {
      // Ignore malformed cache and continue with network fetch.
    }
  }, [feedCacheKey]);

  useEffect(() => {
    if (!feedCacheKey) return;
    const payload: FeedCachePayload = {
      items,
      nextCursor,
      advertisers,
      cachedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(feedCacheKey, JSON.stringify(payload));
    } catch {
      // Ignore storage write failures (private mode / quota).
    }
  }, [advertisers, feedCacheKey, items, nextCursor]);

  useEffect(() => {
    if (!session) return;
    void loadPage();
  }, [session, loadPage]);

  useEffect(() => {
    if (!loading || items.length > 0) {
      setShowInitialFeedLoader(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowInitialFeedLoader(true);
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [items.length, loading]);

  // Fetch feed_view_preference from profile when session loads
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    const fetchPref = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('feed_view_preference')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const v = (data as { feed_view_preference?: string } | null)
        ?.feed_view_preference;
      setFeedViewPreference(v === 'connections' ? 'connections' : 'anyone');
    };
    void fetchPref();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const fetchAdvertisers = useCallback(async () => {
    const [adsRes, partnersRes] = await Promise.all([
      supabase
        .from('feed_advertisers')
        .select(
          'id,company_name,title,description,url,logo_url,image_url,links,active,sort_order',
        )
        .eq('active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('community_partners')
        .select(
          'id,company_name,title,description,url,logo_url,image_url,links,active,sort_order',
        )
        .eq('active', true)
        .eq('featured', true)
        .order('sort_order', { ascending: true }),
    ]);

    if (adsRes.error) return; // Non-fatal: feed still works without ads
    const ads = (adsRes.data ?? []) as Array<
      FeedAdvertiser & { adSource?: 'advertiser' }
    >;
    ads.forEach((a) => {
      (a as FeedAdvertiser & { adSource?: string }).adSource = 'advertiser';
    });

    const partners = (partnersRes.data ?? []).map(
      (p: {
        id: string;
        company_name: string;
        title?: string | null;
        description?: string | null;
        url: string;
        logo_url?: string | null;
        image_url?: string | null;
        links?: unknown;
        active?: boolean;
        sort_order?: number;
      }) =>
        ({
          ...p,
          title: p.title ?? p.company_name,
          description: p.description ?? '',
          active: p.active ?? true,
          sort_order: p.sort_order ?? 0,
          adSource: 'partner' as const,
        }) as FeedAdvertiser & { adSource: 'partner' },
    );

    setAdvertisers([...ads, ...partners] as FeedAdvertiser[]);
  }, []);

  useEffect(() => {
    void fetchAdvertisers();
  }, [fetchAdvertisers]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ADVERTISERS_UPDATED_EVENT_KEY) return;
      void fetchAdvertisers();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [fetchAdvertisers]);

  useEffect(() => {
    const ch1 = supabase
      .channel('feed-advertisers-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_advertisers' },
        () => void fetchAdvertisers(),
      )
      .subscribe();
    const ch2 = supabase
      .channel('community-partners-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_partners' },
        () => void fetchAdvertisers(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [fetchAdvertisers]);

  useEffect(() => {
    if (!session?.user?.id || !session?.access_token) return;
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (cancelled) return;
        void loadPage();
        if (expandedCommentsPostId) {
          void (async () => {
            const { data } = await fetchComments({
              postId: expandedCommentsPostId,
              accessToken: session.access_token,
            });
            if (cancelled) return;
            setCommentsByPostId((prev) => ({
              ...prev,
              [expandedCommentsPostId]: data,
            }));
          })();
        }
      }, 250);
    };
    const channel = supabase
      .channel(`feed-items-live-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_items' },
        scheduleRefresh,
      )
      .subscribe();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [
    expandedCommentsPostId,
    loadPage,
    session?.access_token,
    session?.user?.id,
  ]);

  const handleSubmitPost = async () => {
    const text = composerValue.trim();
    const hasContent = Boolean(text) || composerImages.length > 0;
    if (!hasContent || posting || !session?.access_token) return;
    try {
      setPosting(true);
      await createFeedPost({
        body: text,
        images: composerImages.length > 0 ? composerImages : undefined,
        scheduledAt: composerScheduledAt || undefined,
        accessToken: session.access_token,
      });
      setComposerValue('');
      setComposerImages([]);
      setComposerScheduledAt(null);
      setComposerOpen(false);
      await loadPage();
    } catch (e) {
      await handleAuthError(e, 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleAddPostImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!session?.user) {
      showToast({
        message: 'Please sign in again before uploading images.',
        severity: 'error',
      });
      e.target.value = '';
      return;
    }
    if (!isSupportedImageFile(file)) {
      showToast({
        message: 'Only JPG, PNG, GIF, and WebP images are allowed.',
        severity: 'warning',
      });
      e.target.value = '';
      return;
    }
    if (file.size > FEED_POST_IMAGE_MAX_BYTES) {
      showToast({
        message: `Image too large (${Math.ceil(file.size / (1024 * 1024))}MB). Max is 6MB per file.`,
        severity: 'warning',
      });
      e.target.value = '';
      return;
    }
    setImageUploading(true);
    try {
      const extension =
        fileExtension(file.name) ||
        file.type.split('/')[1]?.toLowerCase() ||
        'jpg';
      const path = `posts/${session.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from('feed-post-images')
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('feed-post-images').getPublicUrl(path);
      if (!publicUrl) throw new Error('Storage URL not returned');
      setComposerImages((prev) => [...prev, publicUrl]);
    } catch (err) {
      const details = toMessage(err);
      showToast({
        message: details
          ? `Image upload failed: ${details}`
          : 'Image upload failed. Please try again.',
        severity: 'error',
      });
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  const handleReaction = useCallback(
    async (postId: string, type: ReactionType) => {
      if (!session?.access_token) return;
      try {
        await setReaction({ postId, type, accessToken: session.access_token });
        trackEvent('feed_reaction_set', {
          post_id: postId,
          reaction_type: type,
        });
      } catch (e) {
        await handleAuthError(e, 'Failed to react');
        void loadPage();
      }
    },
    [handleAuthError, loadPage, session?.access_token],
  );

  const handleRemoveReaction = useCallback(
    async (postId: string, previousType?: ReactionType | null) => {
      if (!session?.access_token) return;
      try {
        await removeReaction({ postId, accessToken: session.access_token });
        trackEvent('feed_reaction_remove', {
          post_id: postId,
          ...(previousType != null && { reaction_type: previousType }),
        });
      } catch (e) {
        await handleAuthError(e, 'Failed to remove reaction');
        void loadPage();
      }
    },
    [handleAuthError, loadPage, session?.access_token],
  );

  const performRepost = useCallback(
    async (originalId: string, commentary?: string) => {
      if (!session?.access_token) return;
      try {
        await repostPost({
          originalId,
          commentary: commentary?.trim() || undefined,
          accessToken: session.access_token,
        });
        setRepostedOriginalIds((prev) => {
          const next = new Set(prev);
          next.add(originalId);
          return next;
        });
        showToast({ message: 'Reposted', severity: 'success' });
        await loadPage();
      } catch (e) {
        const msg = toMessage(e);
        if (msg.toLowerCase().includes('already reposted')) {
          setRepostedOriginalIds((prev) => new Set(prev).add(originalId));
          showToast({
            message: "You've already reposted this post.",
            severity: 'info',
          });
        } else {
          await handleAuthError(e, 'Failed to repost');
        }
      }
    },
    [handleAuthError, loadPage, session?.access_token, showToast],
  );

  const handleRepost = useCallback(
    (item: FeedItem, event?: React.MouseEvent) => {
      if (!event) return;
      setRepostMenuTarget(item);
      setRepostMenuAnchor(event.currentTarget as HTMLElement);
    },
    [],
  );

  const handleSimpleRepost = useCallback(async () => {
    const item = repostMenuTarget;
    setRepostMenuTarget(null);
    setRepostMenuAnchor(null);
    if (!item || !session?.access_token) return;
    const originalId =
      (item.kind === 'repost' && (item.payload?.original_id as string)) ||
      item.id;
    if (repostedOriginalIds.has(originalId)) {
      showToast({
        message: "You've already reposted this post.",
        severity: 'info',
      });
      return;
    }
    await performRepost(originalId);
  }, [
    performRepost,
    repostMenuTarget,
    repostedOriginalIds,
    session?.access_token,
    showToast,
  ]);

  const handleOpenRepostWithComment = useCallback(() => {
    const target = repostMenuTarget;
    setRepostMenuTarget(null);
    setRepostMenuAnchor(null);
    if (target) {
      setRepostWithCommentTarget(target);
      setRepostCommentDraft('');
      setRepostCommentDialogOpen(true);
    }
  }, [repostMenuTarget]);

  const handleRepostWithCommentSubmit = useCallback(async () => {
    const item = repostWithCommentTarget;
    if (!item || !session?.access_token) return;
    const originalId =
      (item.kind === 'repost' && (item.payload?.original_id as string)) ||
      item.id;
    if (repostedOriginalIds.has(originalId)) {
      showToast({
        message: "You've already reposted this post.",
        severity: 'info',
      });
      setRepostCommentDialogOpen(false);
      setRepostWithCommentTarget(null);
      setRepostCommentDraft('');
      return;
    }
    setRepostCommentSubmitting(true);
    try {
      await performRepost(originalId, repostCommentDraft);
      setRepostCommentDialogOpen(false);
      setRepostWithCommentTarget(null);
      setRepostCommentDraft('');
    } finally {
      setRepostCommentSubmitting(false);
    }
  }, [
    performRepost,
    repostCommentDraft,
    repostWithCommentTarget,
    repostedOriginalIds,
    session?.access_token,
    showToast,
  ]);

  const handleSend = useCallback((item: FeedItem) => {
    setShareModalItem(item);
  }, []);

  const handleSendComplete = useCallback((postId: string) => {
    setSentPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
  }, []);

  const handleSave = useCallback(
    async (postId: string) => {
      if (!session?.access_token) return;
      try {
        await saveFeedPost({ postId, accessToken: session.access_token });
        updateItem(postId, { viewer_saved: true });
      } catch (e) {
        await handleAuthError(e, 'Failed to save post');
      }
    },
    [session?.access_token, handleAuthError, updateItem],
  );

  const handleUnsave = useCallback(
    async (postId: string) => {
      if (!session?.access_token) return;
      try {
        await unsaveFeedPost({ postId, accessToken: session.access_token });
        if (savedMode) {
          setItems((prev) => prev.filter((i) => i.id !== postId));
        } else {
          updateItem(postId, { viewer_saved: false });
        }
      } catch (e) {
        await handleAuthError(e, 'Failed to unsave post');
      }
    },
    [session?.access_token, handleAuthError, updateItem, savedMode],
  );

  const handleCommentToggle = useCallback(
    async (postId: string) => {
      if (expandedCommentsPostId === postId) {
        setExpandedCommentsPostId(null);
        return;
      }
      setExpandedCommentsPostId(postId);
      setCommentsLoadingPostId(postId);
      if (!session?.access_token) return;
      try {
        const { data } = await fetchComments({
          postId,
          accessToken: session.access_token,
        });
        setCommentsByPostId((prev) => ({ ...prev, [postId]: data }));
      } catch (e) {
        await handleAuthError(e, 'Failed to load comments');
      } finally {
        setCommentsLoadingPostId(null);
      }
    },
    [expandedCommentsPostId, handleAuthError, session?.access_token],
  );

  const handleAddComment = useCallback(
    async (postId: string, body: string) => {
      if (!session?.access_token) return;
      await addComment({
        postId,
        body,
        accessToken: session.access_token,
      });
      const { data } = await fetchComments({
        postId,
        accessToken: session.access_token,
      });
      setCommentsByPostId((prev) => ({ ...prev, [postId]: data }));
    },
    [session?.access_token],
  );

  const handleEditPost = useCallback(
    async (postId: string, body: string) => {
      if (!session?.access_token) return;
      try {
        await editFeedPost({
          postId,
          body,
          accessToken: session.access_token,
        });
      } catch (e) {
        await handleAuthError(e, 'Could not edit post');
      }
    },
    [handleAuthError, session?.access_token],
  );

  const handleEditComment = useCallback(
    async (postId: string, commentId: string, body: string) => {
      if (!session?.access_token) return;
      try {
        await editFeedComment({
          commentId,
          body,
          accessToken: session.access_token,
        });
        const { data } = await fetchComments({
          postId,
          accessToken: session.access_token,
        });
        setCommentsByPostId((prev) => ({ ...prev, [postId]: data }));
      } catch (e) {
        await handleAuthError(e, 'Could not edit comment');
      }
    },
    [handleAuthError, session?.access_token],
  );

  const handleDeleteComment = useCallback(
    async (postId: string, commentId: string) => {
      if (!session?.access_token) return;
      if (!confirm('Delete this comment? This cannot be undone.')) return;
      try {
        await deleteFeedComment({
          commentId,
          accessToken: session.access_token,
        });
        const { data } = await fetchComments({
          postId,
          accessToken: session.access_token,
        });
        setCommentsByPostId((prev) => ({ ...prev, [postId]: data }));
        updateItem(postId, {
          comment_count: Math.max(
            0,
            (itemsRef.current.find((it) => it.id === postId)?.comment_count ??
              1) - 1,
          ),
        });
      } catch (e) {
        await handleAuthError(e, 'Could not delete comment');
      }
    },
    [handleAuthError, session?.access_token, updateItem],
  );

  const handleCommentReaction = useCallback(
    async (commentId: string, type: ReactionType) => {
      if (!session?.access_token) return;
      try {
        await setReaction({
          postId: commentId,
          type,
          accessToken: session.access_token,
        });
        trackEvent('feed_comment_reaction_set', {
          comment_id: commentId,
          reaction_type: type,
        });
        if (expandedCommentsPostId) {
          const { data } = await fetchComments({
            postId: expandedCommentsPostId,
            accessToken: session.access_token,
          });
          setCommentsByPostId((prev) => ({
            ...prev,
            [expandedCommentsPostId]: data,
          }));
        }
      } catch (e) {
        await handleAuthError(e, 'Could not react to comment');
      }
    },
    [expandedCommentsPostId, handleAuthError, session?.access_token],
  );

  const handleCommentRemoveReaction = useCallback(
    async (commentId: string, previousType?: ReactionType | null) => {
      if (!session?.access_token) return;
      try {
        await removeReaction({
          postId: commentId,
          accessToken: session.access_token,
        });
        trackEvent('feed_comment_reaction_remove', {
          comment_id: commentId,
          ...(previousType != null && { reaction_type: previousType }),
        });
        if (expandedCommentsPostId) {
          const { data } = await fetchComments({
            postId: expandedCommentsPostId,
            accessToken: session.access_token,
          });
          setCommentsByPostId((prev) => ({
            ...prev,
            [expandedCommentsPostId]: data,
          }));
        }
      } catch (e) {
        await handleAuthError(e, 'Could not remove comment reaction');
      }
    },
    [expandedCommentsPostId, handleAuthError, session?.access_token],
  );

  const handleCopyLink = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        showToast({ message: 'Link copied', severity: 'success' });
      } catch {
        showToast({
          message:
            'Could not copy link. Try again or copy from the address bar.',
          severity: 'error',
        });
      }
    },
    [showToast],
  );

  const handleUnfollow = useCallback(
    async (userId: string) => {
      if (!session?.user) return;
      try {
        await disconnect(supabase, userId);
        showToast({
          message: 'You have unfollowed this Member.',
          severity: 'success',
        });
        // Remove posts from this user from feed
        setItems((prev) => prev.filter((item) => item.user_id !== userId));
      } catch (e) {
        await handleAuthError(e, 'Failed to unfollow');
      }
    },
    [session?.user, handleAuthError],
  );

  const handleNotInterested = useCallback(
    (postId: string) => {
      setHiddenPostIds((prev) => {
        const next = new Set(prev).add(postId);
        try {
          localStorage.setItem(
            'feed_hidden_post_ids',
            JSON.stringify([...next]),
          );
        } catch {
          /* ignore */
        }
        return next;
      });
      showToast({
        message: 'We will show fewer posts like this.',
        severity: 'info',
      });
    },
    [showToast],
  );

  const handleReport = useCallback((postId: string, userId?: string) => {
    setReportTarget({ postId, userId });
    setReportDialogOpen(true);
  }, []);

  const handleReportSubmit = useCallback(
    async (
      postId: string | null,
      userId: string | null,
      category: string,
      freeText?: string,
    ) => {
      if (!session?.user || (!postId && !userId)) return;
      try {
        // Use chat_reports table for now (same structure)
        const { error } = await supabase.from('chat_reports').insert({
          reporter_id: session.user.id,
          reported_message_id: postId,
          reported_user_id: userId,
          category: category as
            | 'harassment'
            | 'spam'
            | 'inappropriate_content'
            | 'other',
          free_text: freeText || null,
          status: 'open',
        });
        if (error) throw error;
        showToast({
          message: 'Thank you for your report. We will review it.',
          severity: 'success',
        });
        setReportDialogOpen(false);
        setReportTarget(null);
      } catch (e) {
        showToast({
          message: 'Failed to submit report. Please try again.',
          severity: 'error',
        });
        throw e;
      }
    },
    [session?.user, showToast],
  );

  const handleFeedViewChange = useCallback(
    async (
      _ev: React.MouseEvent<HTMLElement>,
      newValue: FeedViewPreference | null,
    ) => {
      if (newValue === null || newValue === feedViewPreference) return;
      if (!session?.access_token) return;
      try {
        await updateFeedViewPreference({
          feedViewPreference: newValue,
          accessToken: session.access_token,
        });
        setFeedViewPreference(newValue);
        await loadPage();
      } catch (e) {
        await handleAuthError(e, 'Could not update feed view');
      }
    },
    [feedViewPreference, handleAuthError, loadPage, session?.access_token],
  );

  const handleDelete = useCallback(
    async (postId: string) => {
      if (!confirm('Delete this post? This cannot be undone.')) return;
      try {
        await deleteFeedPost({ postId, accessToken: session?.access_token });
        setItems((prev) => {
          const item = prev.find((i) => i.id === postId);
          if (
            item?.kind === 'repost' &&
            item.user_id === session?.user?.id &&
            typeof item.payload?.original_id === 'string'
          ) {
            setRepostedOriginalIds((prevIds) => {
              const next = new Set(prevIds);
              next.delete(item.payload.original_id as string);
              return next;
            });
          }
          return prev.filter((i) => i.id !== postId);
        });
      } catch (e) {
        await handleAuthError(e, 'Could not delete post');
      }
    },
    [session?.access_token, session?.user?.id, handleAuthError],
  );

  const feedCardActions: FeedCardActions = {
    updateItem,
    onReaction: (postId, type) => void handleReaction(postId, type),
    onRemoveReaction: (postId, prevType) =>
      void handleRemoveReaction(postId, prevType),
    onCommentReaction: (commentId, type) =>
      void handleCommentReaction(commentId, type),
    onCommentRemoveReaction: (commentId, prevType) =>
      void handleCommentRemoveReaction(commentId, prevType),
    onRepost: handleRepost,
    onSend: handleSend,
    onSave: (postId) => void handleSave(postId),
    onUnsave: (postId) => void handleUnsave(postId),
    onCopyLink: (url) => void handleCopyLink(url),
    onUnfollow: (userId) => void handleUnfollow(userId),
    onNotInterested: (postId) => void handleNotInterested(postId),
    onReport: (postId, userId) => void handleReport(postId, userId),
    onMenuInfo: (message) => showToast({ message }),
    onCommentToggle: (postId) => void handleCommentToggle(postId),
    onDelete: (postId) => void handleDelete(postId),
    onEditPost: handleEditPost,
    onEditComment: handleEditComment,
    onDeleteComment: handleDeleteComment,
  };

  const postParamProcessed = useRef<string | null>(null);
  const postParamLoadAttempts = useRef(0);
  const MAX_DEEPLINK_LOAD_ATTEMPTS = 3;

  useEffect(() => {
    if (!postParam || loading) return;
    if (postParamProcessed.current !== postParam) {
      postParamLoadAttempts.current = 0;
    }
    if (postParamProcessed.current === postParam) return;
    const found = items.some((i) => i.id === postParam);
    if (found) {
      postParamProcessed.current = postParam;
      postParamLoadAttempts.current = 0;
      requestAnimationFrame(() => {
        const el = document.getElementById(`post-${postParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (expandedCommentsPostId !== postParam) {
            void handleCommentToggle(postParam);
          }
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete('post');
              return next;
            },
            { replace: true },
          );
        }
      });
      return;
    }
    if (
      shouldLoadMoreForDeepLink(
        items,
        postParam,
        Boolean(nextCursor),
        postParamLoadAttempts.current,
        MAX_DEEPLINK_LOAD_ATTEMPTS,
      )
    ) {
      postParamLoadAttempts.current += 1;
      void loadPage(nextCursor, true);
    }
  }, [
    postParam,
    items,
    loading,
    nextCursor,
    expandedCommentsPostId,
    handleCommentToggle,
    setSearchParams,
    loadPage,
  ]);

  return (
    <Box
      sx={{
        position: 'relative',
        flex: 1,
        width: '100%',
        minWidth: 0,
        overflowX: 'hidden',
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          pt: { xs: 3.75, md: 5 },
          pb: { xs: 2, md: 3 },
          px: { xs: 1, sm: 1.5, md: 2 },
        }}
      >
        {/* Page header: Welcome to your Feed + subtext (search is in navbar) */}
        <Box
          sx={{
            pt: { xs: 0.5, md: 0.75 },
            mb: { xs: 2, md: 3 },
            pb: { xs: 1.5, md: 2 },
            borderBottom: '1px solid rgba(156,187,217,0.18)',
          }}
        >
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 1,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: 'inherit' },
            }}
          >
            {savedMode ? 'Saved' : 'Welcome to your Feed'}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 560, fontSize: { xs: '0.875rem', md: 'inherit' } }}
          >
            {savedMode
              ? 'Posts you saved for later. Unsave from the card to remove.'
              : 'Where ideas, updates, and voices from the community come together. Discover members by how they show up.'}
          </Typography>
        </Box>

        <Grid
          container
          spacing={{ xs: 1.5, md: 2 }}
          sx={{
            alignItems: 'flex-start',
          }}
        >
          {/* LEFT SIDEBAR: Explore — hidden on mobile; desktop companion rail */}
          <Grid
            size={{ xs: 12, md: 2, lg: 2 }}
            sx={{
              minWidth: 0,
              order: { xs: 2, md: 1 },
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                position: { xs: 'static', md: 'sticky' },
                top: 88,
                width: '100%',
                maxWidth: { md: 190, lg: 190 },
                minWidth: { md: 145, lg: 145 },
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'rgba(156,187,217,0.18)',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Explore
                </Typography>
              </Box>
              <List dense disablePadding sx={{ py: 0.5 }}>
                <ListSubheader
                  disableSticky
                  sx={{
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    typography: 'caption',
                    lineHeight: 1.66,
                  }}
                >
                  Community
                </ListSubheader>
                {eventsEnabled && (
                  <ListItem disablePadding>
                    <ListItemButton
                      component={RouterLink}
                      to="/events"
                      sx={{
                        minHeight: 40,
                        py: 0.5,
                        borderRadius: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <EventIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Events"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItemButton>
                  </ListItem>
                )}
                {groupsEnabled && (
                  <ListItem disablePadding>
                    <ListItemButton
                      component={RouterLink}
                      to="/groups"
                      sx={{
                        minHeight: 40,
                        py: 0.5,
                        borderRadius: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ForumIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Groups"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItemButton>
                  </ListItem>
                )}
                <ListSubheader
                  disableSticky
                  sx={{
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    typography: 'caption',
                    lineHeight: 1.66,
                  }}
                >
                  Your stuff
                </ListSubheader>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/saved"
                    sx={{
                      minHeight: 40,
                      py: 0.5,
                      borderRadius: 0,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <BookmarkBorderIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Saved"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItemButton>
                </ListItem>
                {chatEnabled && (
                  <ListItem disablePadding>
                    <ListItemButton
                      component={RouterLink}
                      to="/chat-full"
                      sx={{
                        minHeight: 40,
                        py: 0.5,
                        borderRadius: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <MessageIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Messages"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItemButton>
                  </ListItem>
                )}
                <ListSubheader
                  disableSticky
                  sx={{
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    typography: 'caption',
                    lineHeight: 1.66,
                  }}
                >
                  Platform
                </ListSubheader>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/advertise"
                    state={{ backgroundLocation: location }}
                    sx={{
                      minHeight: 40,
                      py: 0.5,
                      borderRadius: 0,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CampaignIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Advertise"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItemButton>
                </ListItem>
                {gamesEnabled && (
                  <ListItem disablePadding>
                    <ListItemButton
                      component="a"
                      href="https://phuzzle.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        minHeight: 40,
                        py: 0.5,
                        borderRadius: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <SportsEsportsIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Games"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItemButton>
                  </ListItem>
                )}
                <ListSubheader
                  disableSticky
                  sx={{
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    typography: 'caption',
                    lineHeight: 1.66,
                  }}
                >
                  Support
                </ListSubheader>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/help"
                    sx={{
                      minHeight: 40,
                      py: 0.5,
                      borderRadius: 0,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <HelpOutlineIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Help"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItemButton>
                </ListItem>
              </List>
            </Paper>
          </Grid>

          {/* CENTER: Feed — scroll with page (single scroll at Layout) */}
          <Grid
            size={{ xs: 12, md: 10, lg: 10 }}
            sx={{
              order: { xs: 1, md: 2 },
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Feed header: title + view toggle + Post + Sort */}
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                mb: { xs: 1.5, md: 2 },
                p: { xs: 1.25, sm: 1.5, md: 2 },
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                gap={{ xs: 1.5, sm: 2 }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  spacing={{ xs: 1.25, sm: 2 }}
                >
                  <Typography variant="h6" fontWeight={600}>
                    Feed
                  </Typography>
                  <ToggleButtonGroup
                    value={feedViewPreference}
                    exclusive
                    onChange={handleFeedViewChange}
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        textTransform: 'none',
                        fontSize: { xs: '0.85rem', sm: '0.8rem' },
                        fontWeight: 400,
                        py: { xs: 0.9, sm: 0.5 },
                        px: { xs: 1.75, sm: 1.5 },
                        minHeight: { xs: 42, sm: 32 },
                      },
                      '& .MuiToggleButton-root.Mui-selected': {
                        fontWeight: 400,
                      },
                    }}
                  >
                    <ToggleButton
                      value="anyone"
                      aria-label="Show posts from everyone"
                    >
                      Anyone
                    </ToggleButton>
                    <ToggleButton
                      value="connections"
                      aria-label="Show posts from connections only"
                    >
                      Connections
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: '100%', sm: 160 } }}
                >
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    displayEmpty
                    inputProps={{ 'aria-label': 'Sort feed posts' }}
                    sx={{ fontSize: { xs: '0.9rem', sm: '0.875rem' } }}
                  >
                    <MenuItem value="recent">Sort by: Recent</MenuItem>
                    <MenuItem value="oldest">Sort by: Oldest</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Paper>

            {/* Start a post — LinkedIn-style composer trigger (hidden on Saved page) */}
            {!savedMode && (
              <Paper
                variant="outlined"
                component="button"
                type="button"
                onClick={() => setComposerOpen(true)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  border: '1px solid rgba(156,187,217,0.26)',
                  bgcolor: 'rgba(36,38,41,0.6)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.2s, border-color 0.2s',
                  '&:hover': {
                    bgcolor: 'rgba(50,52,55,0.8)',
                    borderColor: 'rgba(141,188,229,0.34)',
                  },
                }}
              >
                <ProfileAvatar
                  src={avatarUrl ?? undefined}
                  alt={session?.user?.user_metadata?.full_name ?? 'You'}
                  size="small"
                  sx={{ flexShrink: 0, mr: 2 }}
                />
                <Box
                  sx={{
                    flex: 1,
                    py: 1,
                    px: 2,
                    borderRadius: '9999px',
                    bgcolor: 'rgba(56,132,210,0.14)',
                    color: 'text.secondary',
                    fontSize: '0.95rem',
                  }}
                >
                  Start a post
                </Box>
              </Paper>
            )}

            {/* Feed list — flows with page (single scroll at Layout) */}
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {showInitialFeedLoader ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress aria-label="Loading feed" />
                </Box>
              ) : items.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color="text.primary"
                    gutterBottom
                  >
                    {savedMode ? 'No saved posts yet' : 'Nothing here yet.'}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {savedMode
                      ? 'Save posts from your feed to see them here.'
                      : 'Connect with Weirdlings to fill your feed.'}
                  </Typography>
                  {!savedMode && (
                    <Button
                      component={RouterLink}
                      to="/directory"
                      variant="contained"
                      sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                      Discover Members
                    </Button>
                  )}
                  {!savedMode && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 2 }}
                    >
                      Try searching for people or exploring events.
                    </Typography>
                  )}
                </Paper>
              ) : (
                <>
                  {displayItems.map((entry, index) =>
                    entry.kind === 'post' ? (
                      <Box
                        key={entry.item.id}
                        id={`post-${entry.item.id}`}
                        component="section"
                      >
                        <FeedCard
                          item={entry.item}
                          actions={feedCardActions}
                          isOwner={session?.user?.id === entry.item.user_id}
                          viewerUserId={session?.user?.id}
                          viewerAvatarUrl={avatarUrl}
                          viewerReposted={
                            (entry.item.kind === 'repost' &&
                              session?.user?.id === entry.item.user_id) ||
                            repostedOriginalIds.has(
                              entry.item.kind === 'repost' &&
                                typeof entry.item.payload?.original_id ===
                                  'string'
                                ? (entry.item.payload.original_id as string)
                                : entry.item.id,
                            )
                          }
                          viewerSent={sentPostIds.has(entry.item.id)}
                          commentsExpanded={
                            expandedCommentsPostId === entry.item.id
                          }
                          comments={commentsByPostId[entry.item.id] ?? []}
                          commentsLoading={
                            commentsLoadingPostId === entry.item.id
                          }
                          onAddComment={handleAddComment}
                          isLinkPreviewDismissed={dismissedLinkPreviewIds.has(
                            entry.item.id,
                          )}
                          onDismissLinkPreview={() =>
                            handleDismissLinkPreview(entry.item.id)
                          }
                        />
                      </Box>
                    ) : (
                      <FeedAdCard
                        key={`ad-${entry.advertiser.id}-${index}`}
                        advertiser={entry.advertiser}
                        onDismiss={() => handleDismissAd(entry.advertiser.id)}
                        onImpression={() =>
                          handleAdImpression(entry.advertiser, index)
                        }
                        onAdClick={(payload) =>
                          handleAdClick(entry.advertiser, index, payload)
                        }
                      />
                    ),
                  )}
                  {nextCursor && (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', py: 2 }}
                    >
                      <Button
                        variant="outlined"
                        disabled={loadingMore}
                        onClick={() => void loadPage(nextCursor, true)}
                        startIcon={
                          loadingMore ? <CircularProgress size={16} /> : null
                        }
                      >
                        {loadingMore ? 'Loading…' : 'Load more'}
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Dialog
        open={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          setComposerImages([]);
          setComposerScheduledAt(null);
          setGifPickerOpen(false);
        }}
        maxWidth="sm"
        fullWidth
        fullScreen={isSmallScreen}
        scroll="paper"
        sx={{
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(4, 10, 25, 0.62)',
          },
        }}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: isSmallScreen ? '20px 20px 0 0' : 3,
            border: '1px solid rgba(156,187,217,0.22)',
            boxShadow:
              '0 32px 64px rgba(1, 6, 18, 0.46), inset 0 1px 0 rgba(255,255,255,0.06)',
            width: 'min(100%, 680px)',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: isSmallScreen
              ? '100dvh'
              : 'min(760px, calc(100dvh - 48px))',
            ...(isSmallScreen
              ? {
                  m: 0,
                  width: '100%',
                  maxWidth: '100%',
                  minHeight: '72dvh',
                  maxHeight: '100dvh',
                  alignSelf: 'flex-end',
                }
              : null),
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1.25,
            pt: { xs: 2, sm: 2.25 },
            px: { xs: 1.75, sm: 2.25 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(156,187,217,0.18)',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <ProfileAvatar
              src={avatarUrl ?? undefined}
              alt={session?.user?.user_metadata?.full_name ?? 'You'}
              size="small"
            />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {session?.user?.user_metadata?.full_name ?? 'You'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Post to Anyone
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={() => setComposerOpen(false)}
            aria-label="Close"
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            px: { xs: 1.75, sm: 2.25 },
            pt: { xs: 2.25, sm: 2.75 },
            pb: { xs: 1.4, sm: 1.6 },
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.5, sm: 1.75 },
            minHeight: { xs: 'auto', sm: 360 },
            overflowY: 'auto',
          }}
        >
          <Box
            sx={{
              borderRadius: 2.5,
              border: '1px solid rgba(156,187,217,0.16)',
              bgcolor: 'rgba(7, 18, 34, 0.46)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
              transition:
                'border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease',
              '&:focus-within': {
                borderColor: 'rgba(56,132,210,0.7)',
                boxShadow:
                  '0 0 0 1px rgba(56,132,210,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
                bgcolor: 'rgba(9, 22, 42, 0.6)',
              },
            }}
          >
            <InputBase
              inputRef={composerRef}
              placeholder="Share your thoughts..."
              value={composerValue}
              onChange={(e) => setComposerValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmitPost();
                }
              }}
              fullWidth
              multiline
              minRows={5}
              maxRows={14}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                px: { xs: 1.2, sm: 1.35 },
                py: { xs: 1.05, sm: 1.2 },
                fontSize: '1rem',
                lineHeight: 1.65,
                '& textarea': {
                  overflowY: 'auto !important',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.42)',
                  opacity: 1,
                },
                '&.Mui-focused': { outline: 'none' },
              }}
            />
          </Box>
          {composerImages.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {composerImages.map((url, i) => (
                <Box key={url} sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={url}
                    alt=""
                    sx={{
                      width: 80,
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() =>
                      setComposerImages((prev) =>
                        prev.filter((_, j) => j !== i),
                      )
                    }
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    aria-label="Remove image"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={{ xs: 1, sm: 0.75 }}
            sx={{
              mt: composerImages.length > 0 ? 0.1 : 0.4,
              pt: { xs: 1.1, sm: 1.2 },
              borderTop: '1px solid rgba(156,187,217,0.18)',
              gap: { xs: 0.8, sm: 0.6 },
              flexShrink: 0,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{
                flexWrap: 'wrap',
                gap: 0.5,
              }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAddPostImage}
                disabled={imageUploading}
                style={{ display: 'none' }}
                id="post-image-upload"
              />
              <IconButton
                component="label"
                htmlFor="post-image-upload"
                size="small"
                aria-label="Attach image"
                disabled={imageUploading}
                sx={{
                  color: 'text.secondary',
                  transition:
                    'color 140ms ease, background-color 140ms ease, transform 140ms ease',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: 'action.hover',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <AttachFileIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="Add GIF"
                sx={{
                  color: 'text.secondary',
                  transition:
                    'color 140ms ease, background-color 140ms ease, transform 140ms ease',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: 'action.hover',
                    transform: 'translateY(-1px)',
                  },
                }}
                onClick={() => setGifPickerOpen(true)}
              >
                <GifBoxIcon fontSize="small" />
              </IconButton>
              {imageUploading && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">
                    Uploading…
                  </Typography>
                </Stack>
              )}
              <IconButton
                size="small"
                aria-label="Schedule post"
                sx={{
                  color: 'text.secondary',
                  transition:
                    'color 140ms ease, background-color 140ms ease, transform 140ms ease',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: 'action.hover',
                    transform: 'translateY(-1px)',
                  },
                }}
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setScheduleDate(d.toISOString().slice(0, 10));
                  setScheduleTime('09:30');
                  setScheduleDialogOpen(true);
                }}
              >
                <ScheduleIcon fontSize="small" />
              </IconButton>
              {composerScheduledAt && (
                <Typography
                  variant="caption"
                  color="primary.main"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
                >
                  {new Date(composerScheduledAt).toLocaleString()}
                  <IconButton
                    size="small"
                    onClick={() => setComposerScheduledAt(null)}
                    aria-label="Clear schedule"
                    sx={{ p: 0, ml: 0.25 }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Typography>
              )}
            </Stack>
            <Box sx={{ flex: 1, minWidth: { xs: 0, sm: 8 } }} />
            <Button
              variant="contained"
              size="small"
              onClick={() => void handleSubmitPost()}
              disabled={
                posting ||
                imageUploading ||
                (!composerValue.trim() && composerImages.length === 0)
              }
              sx={{
                textTransform: 'none',
                borderRadius: '9999px',
                px: 2.75,
                py: 0.9,
                alignSelf: { xs: 'stretch', sm: 'center' },
                width: { xs: '100%', sm: 'auto' },
                minWidth: { sm: 112 },
                boxShadow: '0 10px 24px rgba(56,132,210,0.24)',
                '&:hover': { filter: 'brightness(1.08)' },
              }}
            >
              {posting ? 'Posting…' : 'Post'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <GifPicker.GifPickerDialog
        open={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onPick={(url) => setComposerImages((prev) => [...prev, url])}
      />

      {/* Schedule post dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isSmallScreen}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: isSmallScreen ? '20px 20px 0 0' : 2,
            border: '1px solid rgba(156,187,217,0.22)',
            ...(isSmallScreen
              ? {
                  m: 0,
                  width: '100%',
                  maxWidth: '100%',
                  minHeight: '58vh',
                  alignSelf: 'flex-end',
                }
              : null),
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(156,187,217,0.18)',
            pb: 2,
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Schedule post
          </Typography>
          <IconButton
            size="small"
            onClick={() => setScheduleDialogOpen(false)}
            aria-label="Close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {scheduleDate && scheduleTime && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString(
                'en-US',
                {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'short',
                },
              )}{' '}
              based on your location
            </Typography>
          )}
          <Stack spacing={2}>
            <TextField
              label="Date"
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              slotProps={{
                input: {
                  sx: { color: 'text.primary' },
                },
              }}
            />
            <TextField
              label="Time"
              select
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ScheduleIcon
                      sx={{ fontSize: 20, color: 'text.secondary' }}
                    />
                  </InputAdornment>
                ),
              }}
            >
              {SCHEDULE_TIMES.map((t) => {
                const [h, m] = t.split(':').map(Number);
                const label =
                  h === 0
                    ? `12:${m.toString().padStart(2, '0')} AM`
                    : h < 12
                      ? `${h}:${m.toString().padStart(2, '0')} AM`
                      : h === 12
                        ? `12:${m.toString().padStart(2, '0')} PM`
                        : `${h - 12}:${m.toString().padStart(2, '0')} PM`;
                return (
                  <MenuItem key={t} value={t}>
                    {label}
                  </MenuItem>
                );
              })}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setScheduleDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const d = new Date(`${scheduleDate}T${scheduleTime}`);
              if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
                setComposerScheduledAt(d.toISOString());
                showToast({
                  message: `Post scheduled for ${d.toLocaleString()}`,
                  severity: 'success',
                });
                setScheduleDialogOpen(false);
              } else {
                showToast({
                  message: 'Please choose a future date and time.',
                  severity: 'warning',
                });
              }
            }}
            sx={{ textTransform: 'none' }}
          >
            Next
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={repostMenuAnchor}
        open={Boolean(repostMenuAnchor)}
        onClose={() => {
          setRepostMenuAnchor(null);
          setRepostMenuTarget(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        <MenuItem onClick={() => void handleSimpleRepost()} sx={{ gap: 1 }}>
          <RepeatOutlinedIcon fontSize="small" />
          Repost
        </MenuItem>
        <MenuItem onClick={handleOpenRepostWithComment} sx={{ gap: 1 }}>
          <ChatBubbleOutlineOutlinedIcon fontSize="small" />
          Repost with comment
        </MenuItem>
      </Menu>

      <Dialog
        open={repostCommentDialogOpen}
        onClose={() => {
          if (!repostCommentSubmitting) {
            setRepostCommentDialogOpen(false);
            setRepostWithCommentTarget(null);
            setRepostCommentDraft('');
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid rgba(156,187,217,0.22)',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          Repost with comment
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            placeholder="Add your comment..."
            value={repostCommentDraft}
            onChange={(e) => setRepostCommentDraft(e.target.value)}
            disabled={repostCommentSubmitting}
            inputProps={{ 'aria-label': 'Comment for repost' }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            onClick={() => {
              setRepostCommentDialogOpen(false);
              setRepostWithCommentTarget(null);
              setRepostCommentDraft('');
            }}
            disabled={repostCommentSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleRepostWithCommentSubmit()}
            disabled={repostCommentSubmitting}
            startIcon={
              repostCommentSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : null
            }
          >
            {repostCommentSubmitting ? 'Reposting…' : 'Repost'}
          </Button>
        </DialogActions>
      </Dialog>

      <ShareDialog
        item={shareModalItem}
        open={Boolean(shareModalItem) && shareSubDialog === null}
        onClose={() => {
          setShareModalItem(null);
          setShareSubDialog(null);
        }}
        onCopyLink={handleCopyLink}
        onComplete={() => {
          if (shareModalItem) handleSendComplete(shareModalItem.id);
        }}
        mobile={isSmallScreen}
        onOpenShareToConnection={() => setShareSubDialog('connection')}
        onOpenShareToGroup={() => setShareSubDialog('group')}
        chatEnabled={chatEnabled}
      />
      <ReportDialog
        open={reportDialogOpen}
        onClose={() => {
          setReportDialogOpen(false);
          setReportTarget(null);
        }}
        onSubmit={async (postId, userId, category, freeText) => {
          await handleReportSubmit(postId, userId, category, freeText);
        }}
        reportedMessageId={reportTarget?.postId ?? null}
        reportedUserId={reportTarget?.userId ?? null}
      />
      {shareModalItem && (
        <>
          <ShareToConnectionDialog
            open={shareSubDialog === 'connection'}
            onClose={() => setShareSubDialog(null)}
            postUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/feed?post=${encodeURIComponent(shareModalItem.id)}`}
            createDm={createDm}
            onSent={() => {
              handleSendComplete(shareModalItem.id);
              setShareSubDialog(null);
            }}
            onError={(msg) => showToast({ message: msg, severity: 'error' })}
          />
          <ShareToGroupDialog
            open={shareSubDialog === 'group'}
            onClose={() => setShareSubDialog(null)}
            postUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/feed?post=${encodeURIComponent(shareModalItem.id)}`}
            groupRooms={chatRooms.filter((r) => r.room_type === 'group')}
            onSent={() => {
              handleSendComplete(shareModalItem.id);
              setShareSubDialog(null);
            }}
            onError={(msg) => showToast({ message: msg, severity: 'error' })}
          />
        </>
      )}
    </Box>
  );
};
