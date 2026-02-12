import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
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
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  addComment,
  createFeedPost,
  fetchComments,
  fetchFeeds,
  likePost,
  repostPost,
  unlikePost,
  type FeedComment,
  type FeedItem,
} from '../lib/feedsApi';
import { toMessage } from '../lib/errors';
import { supabase } from '../lib/supabaseClient';

const FEED_LIMIT = 20;

export type ConnectionProfile = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar: string | null;
  linkedinUrl: string | null;
};

function parseLinkedInFromSocials(socials: unknown): string | null {
  if (!Array.isArray(socials)) return null;
  const link = socials.find(
    (s) =>
      s &&
      typeof s === 'object' &&
      'platform' in s &&
      'url' in s &&
      'isVisible' in s &&
      String((s as { platform: unknown }).platform).toLowerCase() ===
        'linkedin' &&
      (s as { isVisible: unknown }).isVisible === true,
  );
  return link && typeof (link as { url: unknown }).url === 'string'
    ? ((link as { url: string }).url as string)
    : null;
}

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
              width: 120,
              minWidth: 120,
              height: 120,
              objectFit: 'cover',
              bgcolor: 'action.hover',
            }}
          />
        )}
        <Box sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ color: 'text.primary' }}
            noWrap
          >
            {preview.title || linkPreviewDomain(preview.url)}
          </Typography>
          {preview.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.25 }}
              noWrap
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
  onLike: (postId: string) => void;
  onUnlike: (postId: string) => void;
  onRepost: (item: FeedItem) => void;
  onSend: (item: FeedItem) => void;
  onCommentToggle: (postId: string) => void;
};

type FeedCardProps = {
  item: FeedItem;
  actions: FeedCardActions;
  commentsExpanded: boolean;
  comments: FeedComment[];
  commentsLoading: boolean;
  onAddComment: (postId: string, body: string) => void;
  isLinkPreviewDismissed: boolean;
  onDismissLinkPreview: () => void;
};

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

const FeedCard = ({
  item,
  actions,
  commentsExpanded,
  comments,
  commentsLoading,
  onAddComment,
  isLinkPreviewDismissed,
  onDismissLinkPreview,
}: FeedCardProps) => {
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
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
  const viewerLiked = item.viewer_liked ?? false;
  const commentCount = item.comment_count ?? 0;

  const handleLike = () => {
    if (viewerLiked) {
      actions.onUnlike(item.id);
      actions.updateItem(item.id, {
        viewer_liked: false,
        like_count: Math.max(0, likeCount - 1),
      });
    } else {
      actions.onLike(item.id);
      actions.updateItem(item.id, {
        viewer_liked: true,
        like_count: likeCount + 1,
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
    <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
      <CardContent sx={{ pt: 2, pb: 1, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar
            src={(item.actor?.avatar as string) ?? undefined}
            sx={{ width: 48, height: 48 }}
            component={handle ? RouterLink : 'div'}
            to={handle ? `/profile/${handle}` : undefined}
          >
            {(displayName || '?').charAt(0).toUpperCase()}
          </Avatar>
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
                sx={{ mt: 0.5, whiteSpace: 'pre-wrap', display: 'block' }}
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
              sx={{ mt: 1.5, flexWrap: 'nowrap', alignItems: 'center' }}
            >
              <Button
                size="small"
                startIcon={
                  viewerLiked ? (
                    <ThumbUpIcon sx={{ color: 'primary.main' }} />
                  ) : (
                    <ThumbUpOutlinedIcon />
                  )
                }
                onClick={handleLike}
                sx={{
                  textTransform: 'none',
                  color: viewerLiked ? 'primary.main' : 'text.secondary',
                  minWidth: 0,
                }}
              >
                Like
                {likeCount > 0 && (
                  <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>
                    {likeCount}
                  </Typography>
                )}
              </Button>
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
                          <ListItemAvatar sx={{ minWidth: 36 }}>
                            <Avatar
                              src={c.actor?.avatar ?? undefined}
                              sx={{ width: 28, height: 28 }}
                            >
                              {(c.actor?.display_name || c.actor?.handle || '?')
                                .charAt(0)
                                .toUpperCase()}
                            </Avatar>
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
  const [session, setSession] = useState<{
    user: { id: string };
    user_metadata?: { avatar_url?: string; full_name?: string };
  } | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  type SortOption = 'recent' | 'oldest' | 'most_liked';
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const sortedItems = useMemo(() => {
    if (sortBy === 'recent') return items;
    if (sortBy === 'oldest')
      return [...items].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    if (sortBy === 'most_liked')
      return [...items].sort(
        (a, b) =>
          (b.like_count ?? 0) - (a.like_count ?? 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    return items;
  }, [items, sortBy]);
  const [snack, setSnack] = useState<string | null>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const [posting, setPosting] = useState(false);
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
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

      if (lower.includes('unauthorized') || lower.includes('not signed in')) {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore sign-out failures here
        }
        navigate('/signin', { replace: true });
      } else {
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
      if (!data.session) {
        navigate('/signin', { replace: true });
        return;
      }
      setSession(
        data.session as unknown as {
          user: { id: string };
          user_metadata?: { avatar_url?: string; full_name?: string };
        },
      );
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const loadPage = useCallback(
    async (cursor?: string, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const res = await fetchFeeds({ limit: FEED_LIMIT, cursor });
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
    [handleAuthError],
  );

  useEffect(() => {
    if (!session) return;
    void loadPage();
  }, [session, loadPage]);

  const loadConnections = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data: connRows, error: connErr } = await supabase
        .from('feed_connections')
        .select('connected_user_id')
        .eq('user_id', session.user.id);
      if (connErr || !connRows?.length) {
        setConnections([]);
        return;
      }
      const ids = connRows.map((r) => r.connected_user_id);
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar, socials')
        .in('id', ids)
        .eq('status', 'approved');
      if (profErr || !profiles?.length) {
        setConnections([]);
        return;
      }
      const list: ConnectionProfile[] = profiles.map((p) => ({
        id: p.id,
        handle: p.handle,
        display_name: p.display_name ?? null,
        avatar: p.avatar ?? null,
        linkedinUrl: parseLinkedInFromSocials(p.socials),
      }));
      setConnections(list);
    } catch {
      setConnections([]);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session) return;
    void loadConnections();
  }, [session, loadConnections]);

  const handleSubmitPost = async () => {
    const text = composerValue.trim();
    if (!text || posting) return;
    try {
      setPosting(true);
      await createFeedPost({ body: text });
      setComposerValue('');
      setComposerOpen(false);
      await loadPage();
    } catch (e) {
      await handleAuthError(e, 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = useCallback(
    async (postId: string) => {
      try {
        await likePost({ postId });
      } catch (e) {
        await handleAuthError(e, 'Failed to like');
        const item = items.find((i) => i.id === postId);
        if (item)
          updateItem(postId, {
            viewer_liked: false,
            like_count: Math.max(0, (item.like_count ?? 0) - 1),
          });
      }
    },
    [handleAuthError, items, updateItem],
  );

  const handleUnlike = useCallback(
    async (postId: string) => {
      try {
        await unlikePost({ postId });
      } catch (e) {
        await handleAuthError(e, 'Failed to unlike');
        const item = items.find((i) => i.id === postId);
        if (item)
          updateItem(postId, {
            viewer_liked: true,
            like_count: (item.like_count ?? 0) + 1,
          });
      }
    },
    [handleAuthError, items, updateItem],
  );

  const handleRepost = useCallback(
    async (item: FeedItem) => {
      const originalId =
        (item.kind === 'repost' && (item.payload?.original_id as string)) ||
        item.id;
      try {
        await repostPost({ originalId });
        setSnack('Reposted');
        await loadPage();
      } catch (e) {
        await handleAuthError(e, 'Failed to repost');
      }
    },
    [handleAuthError, loadPage],
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
      try {
        const { data } = await fetchComments({ postId });
        setCommentsByPostId((prev) => ({ ...prev, [postId]: data }));
      } catch (e) {
        await handleAuthError(e, 'Failed to load comments');
      } finally {
        setCommentsLoadingPostId(null);
      }
    },
    [expandedCommentsPostId, handleAuthError],
  );

  const handleAddComment = useCallback(async (postId: string, body: string) => {
    await addComment({ postId, body });
    const { data } = await fetchComments({ postId });
    setCommentsByPostId((prev) => ({ ...prev, [postId]: data }));
  }, []);

  const handleCopyLink = useCallback((url: string) => {
    void navigator.clipboard.writeText(url).then(() => setSnack('Link copied'));
  }, []);

  const feedCardActions: FeedCardActions = {
    updateItem,
    onLike: (postId) => void handleLike(postId),
    onUnlike: (postId) => void handleUnlike(postId),
    onRepost: handleRepost,
    onSend: handleSend,
    onCommentToggle: (postId) => void handleCommentToggle(postId),
  };

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
            Discover people by what they show up.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Left column: Start a post trigger + connections sidebar */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card
              variant="outlined"
              component="button"
              type="button"
              onClick={() => setComposerOpen(true)}
              sx={{
                borderRadius: 2,
                mb: 2,
                position: 'sticky',
                top: 88,
                width: '100%',
                cursor: 'pointer',
                textAlign: 'left',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1.25rem',
                      flexShrink: 0,
                    }}
                  >
                    2
                  </Box>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ flex: 1 }}
                  >
                    Start a post
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* Your connections: tips (wireframe bullet list) */}
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                mb: 2,
                p: 2,
                position: 'sticky',
                top: 320,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Your connections
              </Typography>
              <List
                dense
                disablePadding
                sx={{ listStyleType: 'disc', pl: 2.5 }}
              >
                <ListItem
                  disablePadding
                  sx={{ display: 'list-item', py: 0.25 }}
                >
                  <ListItemText
                    primary="Connect with others from the profile to set on them"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem
                  disablePadding
                  sx={{ display: 'list-item', py: 0.25 }}
                >
                  <ListItemText
                    primary="LinkedIn link in your profile"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem
                  disablePadding
                  sx={{ display: 'list-item', py: 0.25 }}
                >
                  <ListItemText
                    primary="Share work mottos"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem
                  disablePadding
                  sx={{ display: 'list-item', py: 0.25 }}
                >
                  <ListItemText
                    primary="Mutual contributions"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          {/* Center column: feed list */}
          <Grid size={{ xs: 12, sm: 5 }}>
            {/* Sort */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <FormControl size="small" sx={{ minWidth: 180 }}>
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

            {/* Feed list */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress aria-label="Loading feed" />
              </Box>
            ) : items.length === 0 ? (
              <Stack
                spacing={2}
                alignItems="center"
                justifyContent="center"
                sx={{ py: 8, px: 2 }}
              >
                <Typography
                  variant="h6"
                  fontWeight={600}
                  color="text.primary"
                  textAlign="center"
                >
                  Nothing here yet.
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  textAlign="center"
                  sx={{ maxWidth: 400 }}
                >
                  Fill your feed by connecting with Weirdlings.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/directory"
                  variant="contained"
                  size="large"
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Discover People
                </Button>
              </Stack>
            ) : (
              <>
                {sortedItems.map((item) => (
                  <FeedCard
                    key={item.id}
                    item={item}
                    actions={feedCardActions}
                    commentsExpanded={expandedCommentsPostId === item.id}
                    comments={commentsByPostId[item.id] ?? []}
                    commentsLoading={commentsLoadingPostId === item.id}
                    onAddComment={handleAddComment}
                    isLinkPreviewDismissed={dismissedLinkPreviewIds.has(
                      item.id,
                    )}
                    onDismissLinkPreview={() =>
                      handleDismissLinkPreview(item.id)
                    }
                  />
                ))}
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

          {/* Right column: WRDLNKDN News + Your Connections */}
          <Grid size={{ xs: 12, sm: 3 }}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                mb: 2,
                p: 2,
                position: 'sticky',
                top: 88,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                WRDLNKDN News
              </Typography>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    New: Weirdling Feed (MVP)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Share text posts and curated links with your Weirdling
                    network.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Profiles review pipeline
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Approved profiles appear in feeds and the community.
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                mb: 2,
                p: 2,
                position: 'sticky',
                top: 320,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Your Connections
              </Typography>
              <Stack spacing={1}>
                {connections.map((c) => (
                  <Stack
                    key={c.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ py: 0.5 }}
                  >
                    <Avatar
                      src={c.avatar ?? undefined}
                      sx={{ width: 36, height: 36 }}
                      component={RouterLink}
                      to={`/profile/${c.handle}`}
                    >
                      {(c.display_name || c.handle || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        component={RouterLink}
                        to={`/profile/${c.handle}`}
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          display: 'block',
                          color: 'text.primary',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {c.display_name || c.handle}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.linkedinUrl ? 'LinkedIn' : 'Weirdling'}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      component={RouterLink}
                      to={`/profile/${c.handle}`}
                      aria-label={`View ${c.display_name || c.handle}`}
                    >
                      <OpenInNewIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Dialog
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
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
        <DialogTitle sx={{ pb: 0 }}>New post</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <InputBase
            inputRef={composerRef}
            placeholder="What do you want to share?"
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
              bgcolor: 'action.hover',
              borderRadius: 2,
              px: 2,
              py: 1.5,
              '&.Mui-focused': { bgcolor: 'action.selected' },
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1 }}
          >
            You can include links in the text.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button
            onClick={() => setComposerOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmitPost()}
            disabled={posting || !composerValue.trim()}
            sx={{ textTransform: 'none' }}
          >
            {posting ? 'Posting…' : 'Post'}
          </Button>
        </DialogActions>
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
