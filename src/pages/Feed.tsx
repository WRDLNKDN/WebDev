import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import LinkIcon from '@mui/icons-material/Link';
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
  InputBase,
  Link,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  createFeedExternalLink,
  createFeedPost,
  fetchFeeds,
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

const FeedCard = ({ item }: { item: FeedItem }) => {
  const displayName =
    (item.actor?.display_name as string) || item.actor?.handle || 'Weirdling';
  const handle = (item.actor?.handle as string) || null;
  const body =
    (item.payload?.body as string) ||
    (item.payload?.text as string) ||
    (item.kind === 'external_link' && item.payload?.url
      ? `Shared link: ${String(item.payload.url)}`
      : '');
  const url =
    item.kind === 'external_link' ? (item.payload?.url as string) : null;
  const label =
    item.kind === 'external_link' ? (item.payload?.label as string) : null;

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
            </Stack>
            {body && (
              <Typography
                variant="body1"
                sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}
              >
                {body}
              </Typography>
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
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button
                size="small"
                startIcon={<ThumbUpOutlinedIcon />}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                Like
              </Button>
              <Button
                size="small"
                startIcon={<ChatBubbleOutlineOutlinedIcon />}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                Comment
              </Button>
              <Button
                size="small"
                startIcon={<RepeatOutlinedIcon />}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                Repost
              </Button>
              <Button
                size="small"
                startIcon={<SendOutlinedIcon />}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                Send
              </Button>
            </Stack>
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
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [useWeirdlingAvatar, setUseWeirdlingAvatar] = useState(false);
  const [weirdling, setWeirdling] = useState<Weirdling | null | undefined>(
    undefined,
  );

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

  const handleLinkClick = () => {
    setLinkDialogOpen(true);
  };

  const handleSubmitLink = async () => {
    const url = linkUrl.trim();
    if (!url) {
      setSnack('URL is required');
      return;
    }
    try {
      setPosting(true);
      await createFeedExternalLink({ url, label: linkLabel });
      setLinkDialogOpen(false);
      setLinkUrl('');
      setLinkLabel('');
      await loadPage();
    } catch (e) {
      await handleAuthError(e, 'Failed to share link');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 3, px: { xs: 1.5, md: 2 } }}>
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
                  Share text updates now; links and richer posts are coming
                  next.
                </Typography>
                <Stack direction="row" spacing={1}>
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
                  <Button
                    variant="text"
                    startIcon={<LinkIcon />}
                    onClick={handleLinkClick}
                    disabled={posting}
                    sx={{
                      textTransform: 'none',
                      color: 'text.secondary',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    Link
                  </Button>
                </Stack>
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
            <Typography
              color="text.secondary"
              textAlign="center"
              sx={{ py: 6 }}
            >
              No activity yet. Share a post or connect with other Weirdlings to
              see updates here.
            </Typography>
          ) : (
            <>
              {items.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
              {nextCursor && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
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
                  Approved profiles appear in feeds and the directory.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Link dialog */}
      <Dialog
        open={linkDialogOpen}
        onClose={() => {
          if (posting) return;
          setLinkDialogOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Share a link</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            margin="dense"
            label="URL"
            type="url"
            fullWidth
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Label (optional)"
            fullWidth
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (posting) return;
              setLinkDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmitLink()}
            disabled={posting || !linkUrl.trim()}
          >
            {posting ? 'Sharing…' : 'Share'}
          </Button>
        </DialogActions>
      </Dialog>

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
