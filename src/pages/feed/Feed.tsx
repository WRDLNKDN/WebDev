import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CampaignIcon from '@mui/icons-material/Campaign';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EventIcon from '@mui/icons-material/Event';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MessageIcon from '@mui/icons-material/Message';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ForumIcon from '@mui/icons-material/Forum';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import {
  Box,
  Button,
  Card,
  InputAdornment,
  CardContent,
  ClickAwayListener,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputBase,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Popover,
  Select,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { shouldLoadMoreForDeepLink } from '../../lib/feed/deepLink';
import { toMessage } from '../../lib/utils/errors';
import {
  addComment,
  createFeedPost,
  deleteFeedPost,
  fetchComments,
  fetchFeeds,
  removeReaction,
  repostPost,
  setReaction,
  updateFeedViewPreference,
  type FeedComment,
  type FeedItem,
  type FeedViewPreference,
  type ReactionType,
} from '../../lib/api/feedsApi';
import { supabase } from '../../lib/auth/supabaseClient';

import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';

import { ProfileAvatar } from '../../components/avatar/ProfileAvatar';
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import WeirdlingGenerator from '../../components/avatar/WeirdlingGenerator';
import {
  FeedAdCard,
  type FeedAdvertiser,
} from '../../components/feed/FeedAdCard';

const FEED_LIMIT = 20;
const AD_EVERY_N_POSTS = 6;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffM / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffM < 1) return 'Just now';
  if (diffM < 60) return `${diffM}m`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString();
}

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
  onRemoveReaction: (postId: string) => void;
  onRepost: (item: FeedItem) => void;
  onSend: (item: FeedItem) => void;
  onCommentToggle: (postId: string) => void;
  onDelete: (postId: string) => void;
};

type FeedCardProps = {
  item: FeedItem;
  actions: FeedCardActions;
  isOwner: boolean;
  commentsExpanded: boolean;
  comments: FeedComment[];
  commentsLoading: boolean;
  onAddComment: (postId: string, body: string) => void;
  isLinkPreviewDismissed: boolean;
  onDismissLinkPreview: () => void;
};

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

export type FeedDisplayItem =
  | { kind: 'post'; item: FeedItem }
  | { kind: 'ad'; advertiser: FeedAdvertiser };

function interleaveWithAds(
  posts: FeedItem[],
  advertisers: FeedAdvertiser[],
  everyN: number,
): FeedDisplayItem[] {
  if (advertisers.length === 0) {
    return posts.map((item) => ({ kind: 'post' as const, item }));
  }
  const result: FeedDisplayItem[] = [];
  let adIndex = 0;
  posts.forEach((item, i) => {
    if ((i + 1) % everyN === 0) {
      const ad = advertisers[adIndex % advertisers.length];
      result.push({ kind: 'ad', advertiser: ad });
      adIndex += 1;
    }
    result.push({ kind: 'post', item });
  });
  return result;
}

const ShareDialog = ({
  item,
  open,
  onClose,
  onCopyLink,
}: {
  item: FeedItem | null;
  open: boolean;
  onClose: () => void;
  onCopyLink: (url: string) => void;
}) => {
  if (!item) return null;
  const postUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/feed?post=${encodeURIComponent(item.id)}`
      : '';
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share this post</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              onCopyLink(postUrl);
              onClose();
            }}
          >
            Copy link
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            component="a"
          >
            Share to LinkedIn
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

const REACTION_OPTIONS: {
  type: ReactionType;
  label: string;
  Icon: React.ComponentType<{ sx?: object }>;
  IconOutlined: React.ComponentType<{ sx?: object }>;
  color: string;
}[] = [
  {
    type: 'like',
    label: 'Like',
    Icon: ThumbUpIcon,
    IconOutlined: ThumbUpOutlinedIcon,
    color: 'primary.main',
  },
  {
    type: 'love',
    label: 'Love',
    Icon: FavoriteIcon,
    IconOutlined: FavoriteBorderIcon,
    color: 'error.main',
  },
  {
    type: 'inspiration',
    label: 'Insightful',
    Icon: LightbulbIcon,
    IconOutlined: LightbulbOutlinedIcon,
    color: 'warning.main',
  },
  {
    type: 'care',
    label: 'Care',
    Icon: VolunteerActivismIcon,
    IconOutlined: VolunteerActivismOutlinedIcon,
    color: 'success.main',
  },
];

const FeedCard = ({
  item,
  actions,
  isOwner,
  commentsExpanded,
  comments,
  commentsLoading,
  onAddComment,
  isLinkPreviewDismissed,
  onDismissLinkPreview,
}: FeedCardProps) => {
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<HTMLElement | null>(
    null,
  );
  const displayName =
    (item.actor?.display_name as string) || item.actor?.handle || 'Weirdling';
  const handle = (item.actor?.handle as string) || null;
  const snapshot =
    item.kind === 'repost' && item.payload?.snapshot
      ? (item.payload.snapshot as {
          body?: string;
          actor_handle?: string;
          actor_display_name?: string;
        })
      : null;
  const body =
    (snapshot?.body as string) ||
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
  const likeCount = item.like_count ?? 0;
  const loveCount = item.love_count ?? 0;
  const inspirationCount = item.inspiration_count ?? 0;
  const careCount = item.care_count ?? 0;
  const totalReactions = likeCount + loveCount + inspirationCount + careCount;
  const viewerReaction = item.viewer_reaction ?? null;
  const commentCount = item.comment_count ?? 0;

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
      });
    }
  };

  const handleAddComment = async () => {
    const text = commentDraft.trim();
    if (!text || submittingComment) return;
    setSubmittingComment(true);
    try {
      await onAddComment(item.id, text);
      setCommentDraft('');
      actions.updateItem(item.id, {
        comment_count: (item.comment_count ?? 0) + 1,
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, mb: 2, minWidth: 0, position: 'relative' }}
    >
      {isOwner && (
        <IconButton
          size="small"
          onClick={() => actions.onDelete(item.id)}
          aria-label="Delete post"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'text.secondary',
            '&:hover': { color: 'error.main' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
      <CardContent sx={{ pt: 2, pb: 1, '&:last-child': { pb: 2 } }}>
        <Stack
          direction="row"
          spacing={{ xs: 1, sm: 2 }}
          alignItems="flex-start"
        >
          <ProfileAvatar
            src={(item.actor?.avatar as string) ?? undefined}
            alt={displayName || '?'}
            size="small"
            component={handle ? RouterLink : 'div'}
            to={handle ? `/profile/${handle}` : undefined}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              flexWrap="wrap"
              gap={0.5}
            >
              {handle ? (
                <Typography
                  component={RouterLink}
                  to={`/profile/${handle}`}
                  variant="subtitle1"
                  fontWeight={600}
                  sx={{
                    color: 'text.primary',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {displayName}
                </Typography>
              ) : (
                <Typography variant="subtitle1" fontWeight={600}>
                  {displayName}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                • {formatTime(item.created_at)}
              </Typography>
              {item.kind === 'repost' && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25 }}
                >
                  Reposted
                </Typography>
              )}
            </Stack>
            {body && (
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
                {linkifyBody(body)}
              </Typography>
            )}
            {linkPreview?.url && !isLinkPreviewDismissed && (
              <LinkPreviewCard
                preview={linkPreview}
                onDismiss={onDismissLinkPreview}
              />
            )}
            {Array.isArray(item.payload?.images) &&
              (item.payload.images as string[]).length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ mt: 1.5 }}
                  flexWrap="wrap"
                >
                  {(item.payload.images as string[]).map((imgUrl) => (
                    <Box
                      key={imgUrl}
                      component="img"
                      src={imgUrl}
                      alt=""
                      sx={{
                        maxWidth: 280,
                        maxHeight: 280,
                        objectFit: 'cover',
                        borderRadius: 1,
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
            <Stack
              direction="row"
              spacing={1}
              sx={{
                mt: 1.5,
                flexWrap: 'wrap',
                gap: 0.5,
                alignItems: 'center',
              }}
            >
              <ClickAwayListener onClickAway={() => setReactionAnchor(null)}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  {(() => {
                    const current =
                      REACTION_OPTIONS.find((r) => r.type === viewerReaction) ??
                      REACTION_OPTIONS[0];
                    const CurrentIcon = viewerReaction
                      ? current.Icon
                      : current.IconOutlined;
                    return (
                      <Button
                        size="small"
                        startIcon={
                          <CurrentIcon
                            sx={{
                              color: viewerReaction ? current.color : undefined,
                            }}
                          />
                        }
                        onClick={(e) => {
                          setReactionAnchor((prev) =>
                            prev ? null : (e.currentTarget as HTMLElement),
                          );
                        }}
                        sx={{
                          textTransform: 'none',
                          color: viewerReaction
                            ? current.color
                            : 'text.secondary',
                          minWidth: 0,
                        }}
                        aria-label={
                          viewerReaction
                            ? `${current.label} (click to remove)`
                            : 'Like'
                        }
                        aria-haspopup="true"
                        aria-expanded={Boolean(reactionAnchor)}
                      >
                        {viewerReaction ? current.label : 'Like'}
                      </Button>
                    );
                  })()}
                  <Popover
                    open={Boolean(reactionAnchor)}
                    anchorEl={reactionAnchor}
                    onClose={() => setReactionAnchor(null)}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    slotProps={{
                      paper: {
                        sx: {
                          borderRadius: 2,
                          boxShadow: 2,
                          p: 0.5,
                        },
                      },
                    }}
                  >
                    <Stack direction="row" spacing={0.5} sx={{ py: 0.5 }}>
                      {REACTION_OPTIONS.map(({ type, label, Icon, color }) => (
                        <IconButton
                          key={type}
                          size="small"
                          onClick={() => {
                            handleReaction(type);
                            setReactionAnchor(null);
                          }}
                          sx={{
                            color: 'text.secondary',
                            '&:hover': { color },
                          }}
                          aria-label={label}
                        >
                          <Icon sx={{ fontSize: 24 }} />
                        </IconButton>
                      ))}
                    </Stack>
                  </Popover>
                  {totalReactions > 0 && (
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 0.25 }}
                    >
                      {totalReactions}
                    </Typography>
                  )}
                </Box>
              </ClickAwayListener>
              <Button
                size="small"
                startIcon={<ChatBubbleOutlineOutlinedIcon />}
                onClick={() => actions.onCommentToggle(item.id)}
                sx={{
                  textTransform: 'none',
                  color: 'text.secondary',
                  minWidth: 0,
                }}
              >
                Comment
                {commentCount > 0 && (
                  <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>
                    {commentCount}
                  </Typography>
                )}
              </Button>
              <Button
                size="small"
                startIcon={<RepeatOutlinedIcon />}
                onClick={() => actions.onRepost(item)}
                sx={{
                  textTransform: 'none',
                  color: 'text.secondary',
                  minWidth: 0,
                }}
              >
                Repost
              </Button>
              <Button
                size="small"
                startIcon={<SendOutlinedIcon />}
                onClick={() => actions.onSend(item)}
                sx={{
                  textTransform: 'none',
                  color: 'text.secondary',
                  minWidth: 0,
                }}
              >
                Send
              </Button>
            </Stack>
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
                  <>
                    <List dense disablePadding>
                      {comments.map((c) => (
                        <ListItem
                          key={c.id}
                          alignItems="flex-start"
                          disablePadding
                          sx={{ py: 0.5 }}
                        >
                          <ListItemAvatar sx={{ minWidth: 48 }}>
                            <ProfileAvatar
                              src={c.actor?.avatar ?? undefined}
                              alt={
                                c.actor?.display_name || c.actor?.handle || '?'
                              }
                              size="small"
                            />
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={600}>
                                {c.actor?.display_name ||
                                  c.actor?.handle ||
                                  'Someone'}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Typography
                                  variant="body2"
                                  component="span"
                                  sx={{ whiteSpace: 'pre-wrap' }}
                                >
                                  {c.body}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  {formatTime(c.created_at)}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mt: 1 }}
                    >
                      <TextField
                        size="small"
                        placeholder="Write a comment…"
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void handleAddComment();
                          }
                        }}
                        sx={{ flex: 1 }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => void handleAddComment()}
                        disabled={!commentDraft.trim() || submittingComment}
                      >
                        Post
                      </Button>
                    </Stack>
                  </>
                )}
              </Box>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const Feed = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const postParam = searchParams.get('post');
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [composerImages, setComposerImages] = useState<string[]>([]);
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
  type SortOption = 'recent' | 'oldest' | 'most_liked';

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
  const sortedItems = useMemo(() => {
    let list = items;
    if (sortBy === 'oldest')
      list = [...items].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    else if (sortBy === 'most_liked') {
      const total = (x: FeedItem) =>
        (x.like_count ?? 0) +
        (x.love_count ?? 0) +
        (x.inspiration_count ?? 0) +
        (x.care_count ?? 0);
      list = [...items].sort(
        (a, b) =>
          total(b) - total(a) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return list.filter(hasRenderableContent);
  }, [items, sortBy]);
  const visibleAdvertisers = useMemo(
    () => advertisers.filter((a) => !dismissedAdIds.has(a.id)),
    [advertisers, dismissedAdIds],
  );
  const displayItems = useMemo(
    () => interleaveWithAds(sortedItems, visibleAdvertisers, AD_EVERY_N_POSTS),
    [sortedItems, visibleAdvertisers],
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
  const [snack, setSnack] = useState<string | null>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const [posting, setPosting] = useState(false);
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [dismissedLinkPreviewIds, setDismissedLinkPreviewIds] = useState<
    Set<string>
  >(new Set());

  const [feedViewPreference, setFeedViewPreference] =
    useState<FeedViewPreference>('anyone');
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const { avatarUrl } = useCurrentUserAvatar();

  const handleDismissLinkPreview = useCallback((postId: string) => {
    setDismissedLinkPreviewIds((prev) => new Set(prev).add(postId));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<FeedItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }, []);

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
          await supabase.auth.signOut();
        } catch {
          // ignore sign-out failures here
        }
        navigate('/join', { replace: true });
      } else {
        // Just show error, don't redirect
        console.warn('⚠️ Feed: API error (not redirecting):', raw);
        setSnack(toMessage(error) || fallback);
      }
    },
    [navigate],
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
          navigate('/join', { replace: true });
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
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const res = await fetchFeeds({
          limit: FEED_LIMIT,
          cursor,
          accessToken: session.access_token,
        });
        if (append) {
          setItems((prev) => [...prev, ...res.data]);
        } else {
          setItems(res.data);
        }
        setNextCursor(res.nextCursor);
      } catch (e) {
        await handleAuthError(e, 'Failed to load feed');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [handleAuthError, session?.access_token],
  );

  useEffect(() => {
    if (!session) return;
    void loadPage();
  }, [session, loadPage]);

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

  useEffect(() => {
    let cancelled = false;

    const fetchAdvertisers = async () => {
      const { data, error } = await supabase
        .from('feed_advertisers')
        .select(
          'id,company_name,title,description,url,logo_url,image_url,links,active,sort_order',
        )
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (cancelled) return;
      if (error) return; // Non-fatal: feed still works without ads
      setAdvertisers((data ?? []) as FeedAdvertiser[]);
    };

    void fetchAdvertisers();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmitPost = async () => {
    const text = composerValue.trim();
    if (!text || posting || !session?.access_token) return;
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
    if (!file || !session?.user) return;
    const valid = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ].includes(file.type);
    if (!valid) {
      setSnack('Only JPG, PNG, GIF, and WebP images are allowed.');
      return;
    }
    try {
      const path = `posts/${session.user.id}/${crypto.randomUUID()}.${file.name.split('.').pop() ?? 'jpg'}`;
      const { error } = await supabase.storage
        .from('feed-post-images')
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('feed-post-images').getPublicUrl(path);
      setComposerImages((prev) => [...prev, publicUrl]);
    } catch (err) {
      setSnack(toMessage(err));
    }
    e.target.value = '';
  };

  const handleReaction = useCallback(
    async (postId: string, type: ReactionType) => {
      if (!session?.access_token) return;
      try {
        await setReaction({ postId, type, accessToken: session.access_token });
      } catch (e) {
        await handleAuthError(e, 'Failed to react');
        void loadPage();
      }
    },
    [handleAuthError, loadPage, session?.access_token],
  );

  const handleRemoveReaction = useCallback(
    async (postId: string) => {
      if (!session?.access_token) return;
      try {
        await removeReaction({ postId, accessToken: session.access_token });
      } catch (e) {
        await handleAuthError(e, 'Failed to remove reaction');
        void loadPage();
      }
    },
    [handleAuthError, loadPage, session?.access_token],
  );

  const handleRepost = useCallback(
    async (item: FeedItem) => {
      if (!session?.access_token) return;
      const originalId =
        (item.kind === 'repost' && (item.payload?.original_id as string)) ||
        item.id;
      try {
        await repostPost({
          originalId,
          accessToken: session.access_token,
        });
        setSnack('Reposted');
        await loadPage();
      } catch (e) {
        await handleAuthError(e, 'Failed to repost');
      }
    },
    [handleAuthError, loadPage, session?.access_token],
  );

  const handleSend = useCallback((item: FeedItem) => {
    setShareModalItem(item);
  }, []);

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

  const handleCopyLink = useCallback(async (url: string) => {
    await navigator.clipboard.writeText(url);
    setSnack('Link copied');
  }, []);

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
        setItems((prev) => prev.filter((i) => i.id !== postId));
      } catch (e) {
        await handleAuthError(e, 'Could not delete post');
      }
    },
    [session?.access_token, handleAuthError],
  );

  const feedCardActions: FeedCardActions = {
    updateItem,
    onReaction: (postId, type) => void handleReaction(postId, type),
    onRemoveReaction: (postId) => void handleRemoveReaction(postId),
    onRepost: handleRepost,
    onSend: handleSend,
    onCommentToggle: (postId) => void handleCommentToggle(postId),
    onDelete: (postId) => void handleDelete(postId),
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
    <Box sx={{ position: 'relative', flex: 1, width: '100%' }}>
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          py: 3,
          px: { xs: 1.5, md: 2 },
        }}
      >
        {/* Page header: Welcome to your Feed + subtext (search is in navbar) */}
        <Box
          sx={{
            mb: 3,
            pb: 2,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 1,
            }}
          >
            Welcome to your Feed
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 560 }}
          >
            Where ideas, updates, and voices from the community come together.
            Discover members by how they show up.
          </Typography>
        </Box>

        <Grid
          container
          spacing={2}
          sx={{
            alignItems: 'flex-start',
            transition: 'all 0.25s ease-in-out',
          }}
        >
          {/* LEFT SIDEBAR: Explore — hidden on mobile; md: 2-col with Feed; lg: 3-col with Feed + Partners */}
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
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Explore
                </Typography>
              </Box>
              <List dense disablePadding sx={{ py: 0.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block' }}
                >
                  Community
                </Typography>
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
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/forums"
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block' }}
                >
                  Your stuff
                </Typography>
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block' }}
                >
                  Platform
                </Typography>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/advertise"
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
                <ListItem disablePadding>
                  <ListItemButton
                    component="a"
                    href="https://phuzzle.vercel.app/"
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block' }}
                >
                  Support
                </Typography>
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

          {/* CENTER: Feed — full width xs; md: Explore+Feed; lg: 3-col */}
          <Grid
            size={{ xs: 12, md: 10, lg: 7 }}
            sx={{ order: { xs: 1, md: 2 }, minWidth: 0 }}
          >
            {/* Feed header: title + view toggle + Post + Sort */}
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                mb: 2,
                p: 2,
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                gap={2}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
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
                        fontSize: '0.8rem',
                        py: 0.5,
                        px: 1.5,
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
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    displayEmpty
                    sx={{ fontSize: '0.875rem' }}
                  >
                    <MenuItem value="recent">Sort by: Recent</MenuItem>
                    <MenuItem value="oldest">Sort by: Oldest</MenuItem>
                    <MenuItem value="most_liked">Sort by: Most liked</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Paper>

            {/* Start a post — LinkedIn-style composer trigger */}
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
                border: '1px solid rgba(255,255,255,0.12)',
                bgcolor: 'rgba(36,38,41,0.6)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s, border-color 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(50,52,55,0.8)',
                  borderColor: 'rgba(255,255,255,0.18)',
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
                  bgcolor: 'rgba(255,255,255,0.06)',
                  color: 'text.secondary',
                  fontSize: '0.95rem',
                }}
              >
                Start a post
              </Box>
            </Paper>

            {/* Feed list */}
            {loading ? (
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
                  Nothing here yet.
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Connect with Weirdlings to fill your feed.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/directory"
                  variant="contained"
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Discover Members
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 2 }}
                >
                  Try searching for people or exploring events.
                </Typography>
              </Paper>
            ) : (
              <>
                {displayItems.map((entry) =>
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
                      key={`ad-${entry.advertiser.id}`}
                      advertiser={entry.advertiser}
                      onDismiss={() => handleDismissAd(entry.advertiser.id)}
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
          </Grid>

          {/* RIGHT RAIL: Community Partners — hidden until lg (hides before Explore at md) */}
          <Grid
            size={{ xs: 12, md: 12, lg: 3 }}
            sx={{
              minWidth: 0,
              order: { xs: 3, md: 3 },
              display: { xs: 'none', md: 'none', lg: 'block' },
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                p: 2,
                position: { xs: 'static', lg: 'sticky' },
                top: 88,
                width: '100%',
                maxWidth: { lg: 280 },
                minWidth: { lg: 220 },
              }}
            >
              <Box
                sx={{
                  pb: 1.5,
                  mb: 1,
                  borderBottom: '1px solid',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Community Partners
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Community Partners Coming Soon!
              </Typography>

              {/* PROJECT WRDLNKDN INJECTION */}
              <Box
                sx={{
                  mt: 3,
                  pt: 2,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  sx={{ mb: 1, color: 'primary.light' }}
                >
                  Project WRDLNKDN
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Establish your visual identity in the human OS.
                </Typography>
                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={() => setGeneratorOpen(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Initialize Weirdling
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Dialog
        open={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          setComposerImages([]);
          setComposerScheduledAt(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            pt: 2,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
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
        <DialogContent sx={{ pt: 2, pb: 1 }}>
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
            minRows={4}
            sx={{
              bgcolor: 'transparent',
              px: 0,
              py: 0,
              fontSize: '1rem',
              '&.Mui-focused': { outline: 'none' },
            }}
          />
          {composerImages.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
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
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mt: 2, pt: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAddPostImage}
              style={{ display: 'none' }}
              id="post-image-upload"
            />
            <IconButton
              component="label"
              htmlFor="post-image-upload"
              size="small"
              aria-label="Add image"
              sx={{ color: 'text.secondary' }}
            >
              <ImageOutlinedIcon />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Schedule post"
              sx={{ color: 'text.secondary' }}
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                setScheduleDate(d.toISOString().slice(0, 10));
                setScheduleTime('09:30');
                setScheduleDialogOpen(true);
              }}
            >
              <ScheduleIcon />
            </IconButton>
            {composerScheduledAt && (
              <Typography
                variant="caption"
                color="primary.main"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                Scheduled: {new Date(composerScheduledAt).toLocaleString()}
                <IconButton
                  size="small"
                  onClick={() => setComposerScheduledAt(null)}
                  aria-label="Clear schedule"
                  sx={{ p: 0 }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, pt: 0 }}>
          <Button
            variant="contained"
            onClick={() => void handleSubmitPost()}
            disabled={posting || !composerValue.trim()}
            sx={{ textTransform: 'none', borderRadius: '9999px', px: 3 }}
          >
            {posting ? 'Posting…' : 'Post'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule post dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                setSnack(`Post scheduled for ${d.toLocaleString()}`);
                setScheduleDialogOpen(false);
              } else {
                setSnack('Please choose a future date and time.');
              }
            }}
            sx={{ textTransform: 'none' }}
          >
            Next
          </Button>
        </DialogActions>
      </Dialog>

      {/* THE WEIRDLING GENERATOR MODAL */}
      <Dialog
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.1)',
            backgroundImage: 'none',
            position: 'relative',
          },
        }}
      >
        <DialogContent sx={{ p: { xs: 2, sm: 4 } }}>
          {/* Close Button Top Right */}
          <IconButton
            onClick={() => setGeneratorOpen(false)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'text.secondary',
            }}
          >
            <CloseIcon />
          </IconButton>

          <WeirdlingGenerator
            session={session}
            onWeirdlingGenerated={() => {
              setGeneratorOpen(false);
              setSnack('Identity Secured. Welcome to the grid.');
              void loadPage();
            }}
          />
        </DialogContent>
      </Dialog>

      <ShareDialog
        item={shareModalItem}
        open={Boolean(shareModalItem)}
        onClose={() => setShareModalItem(null)}
        onCopyLink={handleCopyLink}
      />

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};
