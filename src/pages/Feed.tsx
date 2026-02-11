import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
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
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { supabase } from '../lib/supabaseClient';
import { getMyWeirdling } from '../lib/weirdlingApi';
import type { Weirdling } from '../types/weirdling';

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
            to={handle ? `/u/${handle}` : undefined}
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
                  to={`/u/${handle}`}
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
    user_metadata?: { avatar_url?: string };
  } | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [sortBy, setSortBy] = useState<'recent'>('recent');
  const [snack, setSnack] = useState<string | null>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const [posting, setPosting] = useState(false);
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [useWeirdlingAvatar, setUseWeirdlingAvatar] = useState(false);
  const [weirdling, setWeirdling] = useState<Weirdling | null | undefined>(
    undefined,
  );
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
      const message =
        error instanceof Error ? error.message : String(error ?? '');
      const lower = message.toLowerCase();

      if (lower.includes('unauthorized') || lower.includes('not signed in')) {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore sign-out failures here
        }
        navigate('/signin', { replace: true });
      } else {
        setSnack(message || fallback);
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
          user_metadata?: { avatar_url?: string };
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

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, weirdlingData] = await Promise.all([
          supabase
            .from('profiles')
            .select('avatar, use_weirdling_avatar')
            .eq('id', session.user.id)
            .maybeSingle(),
          getMyWeirdling().catch(() => null),
        ]);
        if (cancelled) return;
        const p = profileRes?.data;
        setProfileAvatar(p?.avatar ?? null);
        setUseWeirdlingAvatar(p?.use_weirdling_avatar ?? false);
        setWeirdling(weirdlingData ?? null);
      } catch {
        if (!cancelled) {
          setProfileAvatar(null);
          setUseWeirdlingAvatar(false);
          setWeirdling(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const displayAvatar =
    useWeirdlingAvatar && weirdling?.avatarUrl
      ? weirdling.avatarUrl
      : (profileAvatar ?? session?.user_metadata?.avatar_url ?? undefined);

  const handleSubmitPost = async () => {
    const text = composerValue.trim();
    if (!text || posting) return;
    try {
      setPosting(true);
      await createFeedPost({ body: text });
      setComposerValue('');
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
    <Box
      sx={{
        position: 'relative',
        minHeight: '100%',
        bgcolor: '#05070f',
        backgroundImage: 'url(/assets/grid-background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 0%, rgba(0,0,0,0.3), rgba(0,0,0,0.6))',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1200,
          mx: 'auto',
          py: 3,
          px: { xs: 1.5, md: 2 },
        }}
      >
        {/* Page header: Welcome to your Feed + subtext + search */}
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
            sx={{ mb: 2, maxWidth: 560 }}
          >
            Where ideas, updates, and voices from the community come together.
            Discover people by what they share and how they show up.
          </Typography>
          <Paper
            variant="outlined"
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget as HTMLFormElement).get(
                'q',
              );
              const query = typeof q === 'string' ? q.trim() : '';
              navigate(
                query
                  ? `/directory?q=${encodeURIComponent(query)}`
                  : '/directory',
              );
            }}
            sx={{
              display: 'inline-flex',
              borderRadius: 2,
              overflow: 'hidden',
              maxWidth: 360,
              width: '100%',
            }}
          >
            <InputBase
              name="q"
              placeholder="Search for people"
              sx={{
                px: 2,
                py: 1.25,
                width: '100%',
                fontSize: '0.9375rem',
              }}
            />
            <Button type="submit" sx={{ textTransform: 'none' }}>
              Search
            </Button>
          </Paper>
        </Box>

        <Grid container spacing={2}>
          {/* Left column: profile summary (LinkedIn-style sidebar) */}
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
              <Stack spacing={2} alignItems="center">
                <Avatar src={displayAvatar} sx={{ width: 72, height: 72 }}>
                  {(session?.user?.id ?? '?').slice(0, 1).toUpperCase()}
                </Avatar>
                <Box textAlign="center">
                  <Typography variant="subtitle1" fontWeight={600}>
                    Your Weirdling
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Check your dashboard to tune your persona and profile.
                  </Typography>
                </Box>
                <Button
                  component={RouterLink}
                  to="/dashboard"
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: 'none', borderRadius: 999 }}
                >
                  View dashboard
                </Button>
              </Stack>
            </Paper>

            {/* Connections: people you follow + their LinkedIns */}
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
              {connections.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Connect with others from their profile to see them here. Add a
                  LinkedIn link in your profile so others can find you.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
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
                        to={`/u/${c.handle}`}
                      >
                        {(c.display_name || c.handle || '?')
                          .charAt(0)
                          .toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          component={RouterLink}
                          to={`/u/${c.handle}`}
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
                        {c.linkedinUrl ? (
                          <Link
                            href={c.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="caption"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.25,
                              color: 'primary.main',
                            }}
                          >
                            LinkedIn
                            <OpenInNewIcon sx={{ fontSize: 12 }} />
                          </Link>
                        ) : null}
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>

          {/* Center column: composer + feed list */}
          <Grid size={{ xs: 12, sm: 6 }}>
            {/* Start a post */}
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={displayAvatar} sx={{ width: 48, height: 48 }}>
                    {(session?.user?.id ?? '?').slice(0, 1).toUpperCase()}
                  </Avatar>
                  <InputBase
                    inputRef={composerRef}
                    placeholder="Start a post"
                    value={composerValue}
                    onChange={(e) => setComposerValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSubmitPost();
                      }
                    }}
                    fullWidth
                    sx={{
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                      px: 2,
                      py: 1.5,
                      '&.Mui-focused': { bgcolor: 'action.selected' },
                    }}
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mt: 2 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Share a post. You can include links in the text.
                  </Typography>
                  <Button
                    variant="text"
                    startIcon={<ArticleOutlinedIcon />}
                    onClick={() => void handleSubmitPost()}
                    disabled={posting || !composerValue.trim()}
                    sx={{
                      textTransform: 'none',
                      color: 'text.secondary',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    {posting ? 'Posting…' : 'Post'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Sort */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent')}
                  displayEmpty
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="recent">Sort by: Recent</MenuItem>
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
                  Your Feed fills up when you follow people or join
                  conversations. Start by discovering others in the community.
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
                {items.map((item) => (
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

          {/* Right column: news / tips */}
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
          </Grid>
        </Grid>
      </Box>

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
