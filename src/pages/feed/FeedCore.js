/* global URLSearchParams, clearTimeout, confirm, console, crypto, document, localStorage, navigator, requestAnimationFrame, sessionStorage, setTimeout, window */
import AttachFileIcon from '@mui/icons-material/AttachFile';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CampaignIcon from '@mui/icons-material/Campaign';
import CloseIcon from '@mui/icons-material/Close';
import EventIcon from '@mui/icons-material/Event';
import ForumIcon from '@mui/icons-material/Forum';
import GifBoxIcon from '@mui/icons-material/GifBox';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MessageIcon from '@mui/icons-material/Message';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
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
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
} from '../../lib/api/feedsApi';
import { signOut } from '../../lib/auth/signOut';
import { supabase } from '../../lib/auth/supabaseClient';
import { useFeatureFlag } from '../../context/FeatureFlagsContext';
import {
  getOrCreateSessionAdSeed,
  interleaveWithAds,
  seededShuffle,
} from '../../lib/feed/adRotation';
import { shouldLoadMoreForDeepLink } from '../../lib/feed/deepLink';
import { toMessage } from '../../lib/utils/errors';
import { ProfileAvatar } from '../../components/avatar/ProfileAvatar';
import { FeedAdCard } from '../../components/feed/FeedAdCard';
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import {
  fileExtension,
  isSupportedImageFile,
  ShareDialog,
} from './feedRenderUtils';
import { FeedCard } from './feedCard';
import { hasRenderableContent } from './feedCardTypes';
const FEED_LIMIT = 20;
const FEED_POST_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
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
const FEED_CACHE_TTL_MS = 5 * 60 * 1e3;
const FEED_CACHE_KEY_PREFIX = 'feed_cache_v1';
const ADVERTISERS_UPDATED_EVENT_KEY = 'feed_advertisers_updated_at';
const Feed = ({ savedMode = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const postParam = searchParams.get('post');
  const eventsEnabled = useFeatureFlag('events');
  const groupsEnabled = useFeatureFlag('groups');
  const chatEnabled = useFeatureFlag('chat');
  const gamesEnabled = useFeatureFlag('games');
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [dismissedAdIds, setDismissedAdIds] = useState(() => {
    try {
      const s = localStorage.getItem('feed_dismissed_ad_ids');
      return s ? new Set(JSON.parse(s)) : /* @__PURE__ */ new Set();
    } catch {
      return /* @__PURE__ */ new Set();
    }
  });
  const [nextCursor, setNextCursor] = useState();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [composerImages, setComposerImages] = useState([]);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [composerScheduledAt, setComposerScheduledAt] = useState(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [scheduleTime, setScheduleTime] = useState('09:30');
  const SCHEDULE_TIMES = (() => {
    const times = [];
    for (let h = 6; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        times.push(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        );
      }
    }
    return times;
  })();
  const [sortBy, setSortBy] = useState('recent');
  const adImpressionStorageKey = useMemo(
    () => `feed_ad_impressions:${session?.user?.id ?? 'anon'}`,
    [session?.user?.id],
  );
  const [adImpressionCounts, setAdImpressionCounts] = useState({});
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(adImpressionStorageKey);
      if (!raw) {
        setAdImpressionCounts({});
        return;
      }
      const parsed = JSON.parse(raw);
      const sanitized = {};
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
    let list = items;
    if (sortBy === 'oldest')
      list = [...items].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    return list;
  }, [items, sortBy]);
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
  const displayItems = useMemo(
    () =>
      savedMode
        ? sortedItems.map((item) => ({ kind: 'post', item }))
        : interleaveWithAds(
            sortedItems,
            shuffledAdvertisers,
            AD_EVERY_N_POSTS,
            hasRenderableContent,
          ),
    [savedMode, sortedItems, shuffledAdvertisers],
  );
  const handleDismissAd = useCallback((adId) => {
    setDismissedAdIds((prev) => {
      const next = new Set(prev).add(adId);
      try {
        localStorage.setItem(
          'feed_dismissed_ad_ids',
          JSON.stringify([...next]),
        );
      } catch {
        // Ignore storage write failures for dismissed ads.
      }
      return next;
    });
  }, []);
  const handleAdImpression = useCallback(
    (advertiser, slotIndex) => {
      setAdImpressionCounts((prev) => {
        const nextCount = (prev[advertiser.id] ?? 0) + 1;
        const next = { ...prev, [advertiser.id]: nextCount };
        try {
          sessionStorage.setItem(adImpressionStorageKey, JSON.stringify(next));
        } catch {
          // Ignore storage write failures for ad impression counters.
        }
        return next;
      });
      trackEvent('feed_ad_impression', {
        source: 'feed',
        ad_id: advertiser.id,
        advertiser_name: advertiser.company_name,
        slot_index: slotIndex,
      });
      const adSource = advertiser.adSource;
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
    (advertiser, slotIndex, payload) => {
      trackEvent('feed_ad_click', {
        source: 'feed',
        ad_id: advertiser.id,
        advertiser_name: advertiser.company_name,
        slot_index: slotIndex,
        target: payload.target,
        url: payload.url,
      });
      const adSource = advertiser.adSource;
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
  const [snack, setSnack] = useState(null);
  const composerRef = useRef(null);
  const [posting, setPosting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState(null);
  const [commentsByPostId, setCommentsByPostId] = useState({});
  const [commentsLoadingPostId, setCommentsLoadingPostId] = useState(null);
  const [shareModalItem, setShareModalItem] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [dismissedLinkPreviewIds, setDismissedLinkPreviewIds] = useState(
    /* @__PURE__ */ new Set(),
  );
  const [feedViewPreference, setFeedViewPreference] = useState('anyone');
  const { avatarUrl } = useCurrentUserAvatar();
  const feedCacheKey = useMemo(
    () =>
      session?.user?.id
        ? `${FEED_CACHE_KEY_PREFIX}:${session.user.id}${savedMode ? ':saved' : ''}`
        : null,
    [session?.user?.id, savedMode],
  );
  const handleDismissLinkPreview = useCallback((postId) => {
    setDismissedLinkPreviewIds((prev) => new Set(prev).add(postId));
  }, []);
  const updateItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }, []);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
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
    async (error, fallback) => {
      const raw = error instanceof Error ? error.message : String(error ?? '');
      const lower = raw.toLowerCase();
      const isSupabaseAuthError =
        (lower.includes('jwt') && lower.includes('expired')) ||
        lower.includes('refresh token') ||
        lower.includes('invalid claim') ||
        (lower.includes('not signed in') && lower.includes('supabase'));
      if (isSupabaseAuthError) {
        console.warn('\u{1F534} Feed: Supabase auth error, signing out:', raw);
        try {
          await signOut();
        } catch {
          // Ignore sign-out failures and still route the user back to join.
        }
        navigate('/join', { replace: true });
      } else {
        console.warn('\u26A0\uFE0F Feed: API error (not redirecting):', raw);
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
      if (evt === 'SIGNED_OUT') {
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
      if (newSession) {
        setSession(newSession);
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);
  const loadPage = useCallback(
    async (cursor, append = false) => {
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
      const parsed = JSON.parse(raw);
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
      // Ignore cache persistence failures and continue with in-memory feed state.
    }
  }, [feedCacheKey]);
  useEffect(() => {
    if (!feedCacheKey) return;
    const payload = {
      items,
      nextCursor,
      advertisers,
      cachedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(feedCacheKey, JSON.stringify(payload));
    } catch {
      // Ignore cache persistence failures and continue with in-memory feed state.
    }
  }, [advertisers, feedCacheKey, items, nextCursor]);
  useEffect(() => {
    if (!session) return;
    void loadPage();
  }, [session, loadPage]);
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
      const v = data?.feed_view_preference;
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
    if (adsRes.error) return;
    const ads = adsRes.data ?? [];
    ads.forEach((a) => {
      a.adSource = 'advertiser';
    });
    const partners = (partnersRes.data ?? []).map((p) => ({
      ...p,
      title: p.title ?? p.company_name,
      description: p.description ?? '',
      active: p.active ?? true,
      sort_order: p.sort_order ?? 0,
      adSource: 'partner',
    }));
    setAdvertisers([...ads, ...partners]);
  }, []);
  useEffect(() => {
    void fetchAdvertisers();
  }, [fetchAdvertisers]);
  useEffect(() => {
    const onStorage = (event) => {
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
    let refreshTimer = null;
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
    if (!text || posting || !session?.access_token) return;
    try {
      setPosting(true);
      await createFeedPost({
        body: text,
        images: composerImages.length > 0 ? composerImages : void 0,
        scheduledAt: composerScheduledAt || void 0,
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
  const handleAddPostImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!session?.user) {
      setSnack('Please sign in again before uploading images.');
      e.target.value = '';
      return;
    }
    if (!isSupportedImageFile(file)) {
      setSnack('Only JPG, PNG, GIF, and WebP images are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > FEED_POST_IMAGE_MAX_BYTES) {
      setSnack(
        `Image too large (${Math.ceil(file.size / (1024 * 1024))}MB). Max is 6MB per file.`,
      );
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
      setSnack(
        details
          ? `Image upload failed: ${details}`
          : 'Image upload failed. Please try again.',
      );
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };
  const handleReaction = useCallback(
    async (postId, type) => {
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
    async (postId, previousType) => {
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
  const handleRepost = useCallback(
    async (item) => {
      if (!session?.access_token) return;
      const originalId =
        (item.kind === 'repost' && item.payload?.original_id) || item.id;
      try {
        await repostPost({
          originalId,
          accessToken: session.access_token,
        });
        setSnack('Reposted');
        await loadPage();
      } catch (e) {
        const msg = toMessage(e);
        if (msg.toLowerCase().includes('already reposted')) {
          setSnack("You've already reposted this post.");
        } else {
          await handleAuthError(e, 'Failed to repost');
        }
      }
    },
    [handleAuthError, loadPage, session?.access_token],
  );
  const handleSend = useCallback((item) => {
    setShareModalItem(item);
  }, []);
  const handleSave = useCallback(
    async (postId) => {
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
    async (postId) => {
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
    async (postId) => {
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
    async (postId, body) => {
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
    async (postId, body) => {
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
    async (postId, commentId, body) => {
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
    async (postId, commentId) => {
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
    async (commentId, type) => {
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
    async (commentId, previousType) => {
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
  const handleCopyLink = useCallback(async (url) => {
    await navigator.clipboard.writeText(url);
    setSnack('Link copied');
  }, []);
  const handleFeedViewChange = useCallback(
    async (_ev, newValue) => {
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
    async (postId) => {
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
  const feedCardActions = {
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
    onCommentToggle: (postId) => void handleCommentToggle(postId),
    onDelete: (postId) => void handleDelete(postId),
    onEditPost: handleEditPost,
    onEditComment: handleEditComment,
    onDeleteComment: handleDeleteComment,
  };
  const postParamProcessed = useRef(null);
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
  return /* @__PURE__ */ React.createElement(
    Box,
    {
      sx: {
        position: 'relative',
        flex: 1,
        width: '100%',
        minWidth: 0,
        overflowX: 'hidden',
      },
    },
    /* @__PURE__ */ React.createElement(
      Box,
      {
        sx: {
          maxWidth: 1200,
          mx: 'auto',
          py: { xs: 2, md: 3 },
          px: { xs: 1, sm: 1.5, md: 2 },
        },
      },
      /* @__PURE__ */ React.createElement(
        Box,
        {
          sx: {
            mb: { xs: 2, md: 3 },
            pb: { xs: 1.5, md: 2 },
            borderBottom: '1px solid rgba(156,187,217,0.18)',
          },
        },
        /* @__PURE__ */ React.createElement(
          Typography,
          {
            component: 'h1',
            variant: 'h4',
            sx: {
              fontWeight: 600,
              color: 'text.primary',
              mb: 1,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: 'inherit' },
            },
          },
          savedMode ? 'Saved' : 'Welcome to your Feed',
        ),
        /* @__PURE__ */ React.createElement(
          Typography,
          {
            variant: 'body1',
            color: 'text.secondary',
            sx: { maxWidth: 560, fontSize: { xs: '0.875rem', md: 'inherit' } },
          },
          savedMode
            ? 'Posts you saved for later. Unsave from the card to remove.'
            : 'Where ideas, updates, and voices from the community come together. Discover members by how they show up.',
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Grid,
        {
          container: true,
          spacing: { xs: 1.5, md: 2 },
          sx: {
            alignItems: 'flex-start',
          },
        },
        /* @__PURE__ */ React.createElement(
          Grid,
          {
            size: { xs: 12, md: 2, lg: 2 },
            sx: {
              minWidth: 0,
              order: { xs: 2, md: 1 },
              display: { xs: 'none', md: 'block' },
            },
          },
          /* @__PURE__ */ React.createElement(
            Paper,
            {
              variant: 'outlined',
              sx: {
                borderRadius: 2,
                overflow: 'hidden',
                position: { xs: 'static', md: 'sticky' },
                top: 88,
                width: '100%',
                maxWidth: { md: 190, lg: 190 },
                minWidth: { md: 145, lg: 145 },
              },
            },
            /* @__PURE__ */ React.createElement(
              Box,
              {
                sx: {
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'rgba(156,187,217,0.18)',
                },
              },
              /* @__PURE__ */ React.createElement(
                Typography,
                { variant: 'subtitle1', fontWeight: 700 },
                'Explore',
              ),
            ),
            /* @__PURE__ */ React.createElement(
              List,
              { dense: true, disablePadding: true, sx: { py: 0.5 } },
              /* @__PURE__ */ React.createElement(
                ListSubheader,
                {
                  disableSticky: true,
                  sx: {
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    typography: 'caption',
                    lineHeight: 1.66,
                  },
                },
                'Community',
              ),
              eventsEnabled &&
                /* @__PURE__ */ React.createElement(
                  ListItem,
                  { disablePadding: true },
                  /* @__PURE__ */ React.createElement(
                    ListItemButton,
                    {
                      component: RouterLink,
                      to: '/events',
                      sx: {
                        minHeight: 40,
                        py: 0.5,
                        borderRadius: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                      },
                    },
                    /* @__PURE__ */ React.createElement(
                      ListItemIcon,
                      { sx: { minWidth: 36 } },
                      /* @__PURE__ */ React.createElement(EventIcon, {
                        fontSize: 'small',
                      }),
                    ),
                    /* @__PURE__ */ React.createElement(ListItemText, {
                      primary: 'Events',
                      primaryTypographyProps: { variant: 'body2' },
                    }),
                  ),
                ),
              groupsEnabled &&
                /* @__PURE__ */ React.createElement(
                  ListItem,
                  { disablePadding: true },
                  /* @__PURE__ */ React.createElement(
                    ListItemButton,
                    {
                      component: RouterLink,
                      to: '/groups',
                      sx: {
                        minHeight: 40,
                        py: 0.5,
                        borderRadius: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                      },
                    },
                    /* @__PURE__ */ React.createElement(
                      ListItemIcon,
                      { sx: { minWidth: 36 } },
                      /* @__PURE__ */ React.createElement(ForumIcon, {
                        fontSize: 'small',
                      }),
                    ),
                    /* @__PURE__ */ React.createElement(ListItemText, {
                      primary: 'Groups',
                      primaryTypographyProps: { variant: 'body2' },
                    }),
                  ),
                ),
              /* @__PURE__ */ React.createElement(
                ListSubheader,
                {
                  disableSticky: true,
                  sx: {
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    typography: 'caption',
                    lineHeight: 1.66,
                  },
                },
                'Your stuff',
              ),
              /* @__PURE__ */ React.createElement(
                ListItem,
                { disablePadding: true },
                /* @__PURE__ */ React.createElement(
                  ListItemButton,
                  {
                    component: RouterLink,
                    to: '/saved',
                    sx: {
                      minHeight: 40,
                      py: 0.5,
                      borderRadius: 0,
                      '&:hover': { bgcolor: 'action.hover' },
                    },
                  },
                  /* @__PURE__ */ React.createElement(
                    ListItemIcon,
                    { sx: { minWidth: 36 } },
                    /* @__PURE__ */ React.createElement(BookmarkBorderIcon, {
                      fontSize: 'small',
                    }),
                  ),
                  /* @__PURE__ */ React.createElement(ListItemText, {
                    primary: 'Saved',
                    primaryTypographyProps: { variant: 'body2' },
                  }),
                ),
              ),
              chatEnabled &&
                /* @__PURE__ */ React.createElement(
                  ListItem,
                  { disablePadding: true },
                  /* @__PURE__ */ React.createElement(
                    ListItemButton,
                    {
                      component: RouterLink,
                      to: '/chat-full',
                      sx: {
                        minHeight: 40,
                        py: 0.5,
                        borderRadius: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                      },
                    },
                    /* @__PURE__ */ React.createElement(
                      ListItemIcon,
                      { sx: { minWidth: 36 } },
                      /* @__PURE__ */ React.createElement(MessageIcon, {
                        fontSize: 'small',
                      }),
                    ),
                    /* @__PURE__ */ React.createElement(ListItemText, {
                      primary: 'Messages',
                      primaryTypographyProps: { variant: 'body2' },
                    }),
                  ),
                ),
              /* @__PURE__ */ React.createElement(
                ListSubheader,
                {
                  disableSticky: true,
                  sx: {
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    typography: 'caption',
                    lineHeight: 1.66,
                  },
                },
                'Platform',
              ),
              /* @__PURE__ */ React.createElement(
                ListItem,
                { disablePadding: true },
                /* @__PURE__ */ React.createElement(
                  ListItemButton,
                  {
                    component: RouterLink,
                    to: '/advertise',
                    state: { backgroundLocation: location },
                    sx: {
                      minHeight: 40,
                      py: 0.5,
                      borderRadius: 0,
                      '&:hover': { bgcolor: 'action.hover' },
                    },
                  },
                  /* @__PURE__ */ React.createElement(
                    ListItemIcon,
                    { sx: { minWidth: 36 } },
                    /* @__PURE__ */ React.createElement(CampaignIcon, {
                      fontSize: 'small',
                    }),
                  ),
                  /* @__PURE__ */ React.createElement(ListItemText, {
                    primary: 'Advertise',
                    primaryTypographyProps: { variant: 'body2' },
                  }),
                ),
              ),
              gamesEnabled &&
                /* @__PURE__ */ React.createElement(
                  ListItem,
                  { disablePadding: true },
                  /* @__PURE__ */ React.createElement(
                    ListItemButton,
                    {
                      component: 'a',
                      href: 'https://phuzzle.vercel.app',
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      sx: {
                        minHeight: 40,
                        py: 0.5,
                        borderRadius: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                      },
                    },
                    /* @__PURE__ */ React.createElement(
                      ListItemIcon,
                      { sx: { minWidth: 36 } },
                      /* @__PURE__ */ React.createElement(SportsEsportsIcon, {
                        fontSize: 'small',
                      }),
                    ),
                    /* @__PURE__ */ React.createElement(ListItemText, {
                      primary: 'Games',
                      primaryTypographyProps: { variant: 'body2' },
                    }),
                  ),
                ),
              /* @__PURE__ */ React.createElement(
                ListSubheader,
                {
                  disableSticky: true,
                  sx: {
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    typography: 'caption',
                    lineHeight: 1.66,
                  },
                },
                'Support',
              ),
              /* @__PURE__ */ React.createElement(
                ListItem,
                { disablePadding: true },
                /* @__PURE__ */ React.createElement(
                  ListItemButton,
                  {
                    component: RouterLink,
                    to: '/help',
                    sx: {
                      minHeight: 40,
                      py: 0.5,
                      borderRadius: 0,
                      '&:hover': { bgcolor: 'action.hover' },
                    },
                  },
                  /* @__PURE__ */ React.createElement(
                    ListItemIcon,
                    { sx: { minWidth: 36 } },
                    /* @__PURE__ */ React.createElement(HelpOutlineIcon, {
                      fontSize: 'small',
                    }),
                  ),
                  /* @__PURE__ */ React.createElement(ListItemText, {
                    primary: 'Help',
                    primaryTypographyProps: { variant: 'body2' },
                  }),
                ),
              ),
            ),
          ),
        ),
        /* @__PURE__ */ React.createElement(
          Grid,
          {
            size: { xs: 12, md: 10, lg: 10 },
            sx: {
              order: { xs: 1, md: 2 },
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            },
          },
          /* @__PURE__ */ React.createElement(
            Paper,
            {
              variant: 'outlined',
              sx: {
                borderRadius: 2,
                mb: { xs: 1.5, md: 2 },
                p: { xs: 1.25, sm: 1.5, md: 2 },
              },
            },
            /* @__PURE__ */ React.createElement(
              Stack,
              {
                direction: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: { xs: 1.5, sm: 2 },
              },
              /* @__PURE__ */ React.createElement(
                Stack,
                {
                  direction: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  spacing: { xs: 1.25, sm: 2 },
                },
                /* @__PURE__ */ React.createElement(
                  Typography,
                  { variant: 'h6', fontWeight: 600 },
                  'Feed',
                ),
                /* @__PURE__ */ React.createElement(
                  ToggleButtonGroup,
                  {
                    value: feedViewPreference,
                    exclusive: true,
                    onChange: handleFeedViewChange,
                    size: 'small',
                    sx: {
                      '& .MuiToggleButton-root': {
                        textTransform: 'none',
                        fontSize: { xs: '0.85rem', sm: '0.8rem' },
                        py: { xs: 0.9, sm: 0.5 },
                        px: { xs: 1.75, sm: 1.5 },
                        minHeight: { xs: 42, sm: 32 },
                      },
                    },
                  },
                  /* @__PURE__ */ React.createElement(
                    ToggleButton,
                    {
                      value: 'anyone',
                      'aria-label': 'Show posts from everyone',
                    },
                    'Anyone',
                  ),
                  /* @__PURE__ */ React.createElement(
                    ToggleButton,
                    {
                      value: 'connections',
                      'aria-label': 'Show posts from connections only',
                    },
                    'Connections',
                  ),
                ),
              ),
              /* @__PURE__ */ React.createElement(
                FormControl,
                {
                  size: 'small',
                  sx: { minWidth: { xs: '100%', sm: 160 } },
                },
                /* @__PURE__ */ React.createElement(
                  Select,
                  {
                    value: sortBy,
                    onChange: (e) => setSortBy(e.target.value),
                    displayEmpty: true,
                    inputProps: { 'aria-label': 'Sort feed posts' },
                    sx: { fontSize: { xs: '0.9rem', sm: '0.875rem' } },
                  },
                  /* @__PURE__ */ React.createElement(
                    MenuItem,
                    { value: 'recent' },
                    'Sort by: Recent',
                  ),
                  /* @__PURE__ */ React.createElement(
                    MenuItem,
                    { value: 'oldest' },
                    'Sort by: Oldest',
                  ),
                ),
              ),
            ),
          ),
          !savedMode &&
            /* @__PURE__ */ React.createElement(
              Paper,
              {
                variant: 'outlined',
                component: 'button',
                type: 'button',
                onClick: () => setComposerOpen(true),
                sx: {
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
                },
              },
              /* @__PURE__ */ React.createElement(ProfileAvatar, {
                src: avatarUrl ?? void 0,
                alt: session?.user?.user_metadata?.full_name ?? 'You',
                size: 'small',
                sx: { flexShrink: 0, mr: 2 },
              }),
              /* @__PURE__ */ React.createElement(
                Box,
                {
                  sx: {
                    flex: 1,
                    py: 1,
                    px: 2,
                    borderRadius: '9999px',
                    bgcolor: 'rgba(56,132,210,0.14)',
                    color: 'text.secondary',
                    fontSize: '0.95rem',
                  },
                },
                'Start a post',
              ),
            ),
          /* @__PURE__ */ React.createElement(
            Box,
            { sx: { display: 'flex', flexDirection: 'column' } },
            loading && items.length === 0
              ? /* @__PURE__ */ React.createElement(
                  Box,
                  { sx: { display: 'flex', justifyContent: 'center', py: 6 } },
                  /* @__PURE__ */ React.createElement(CircularProgress, {
                    'aria-label': 'Loading feed',
                  }),
                )
              : items.length === 0
                ? /* @__PURE__ */ React.createElement(
                    Paper,
                    {
                      variant: 'outlined',
                      sx: {
                        borderRadius: 2,
                        p: 4,
                        textAlign: 'center',
                      },
                    },
                    /* @__PURE__ */ React.createElement(
                      Typography,
                      {
                        variant: 'h6',
                        fontWeight: 600,
                        color: 'text.primary',
                        gutterBottom: true,
                      },
                      savedMode ? 'No saved posts yet' : 'Nothing here yet.',
                    ),
                    /* @__PURE__ */ React.createElement(
                      Typography,
                      {
                        variant: 'body2',
                        color: 'text.secondary',
                        sx: { mb: 2 },
                      },
                      savedMode
                        ? 'Save posts from your feed to see them here.'
                        : 'Connect with Weirdlings to fill your feed.',
                    ),
                    !savedMode &&
                      /* @__PURE__ */ React.createElement(
                        Button,
                        {
                          component: RouterLink,
                          to: '/directory',
                          variant: 'contained',
                          sx: { textTransform: 'none', borderRadius: 2 },
                        },
                        'Discover Members',
                      ),
                    !savedMode &&
                      /* @__PURE__ */ React.createElement(
                        Typography,
                        {
                          variant: 'caption',
                          color: 'text.secondary',
                          sx: { display: 'block', mt: 2 },
                        },
                        'Try searching for people or exploring events.',
                      ),
                  )
                : /* @__PURE__ */ React.createElement(
                    React.Fragment,
                    null,
                    displayItems.map((entry, index) =>
                      entry.kind === 'post'
                        ? /* @__PURE__ */ React.createElement(
                            Box,
                            {
                              key: entry.item.id,
                              id: `post-${entry.item.id}`,
                              component: 'section',
                            },
                            /* @__PURE__ */ React.createElement(FeedCard, {
                              item: entry.item,
                              actions: feedCardActions,
                              isOwner: session?.user?.id === entry.item.user_id,
                              viewerUserId: session?.user?.id,
                              viewerAvatarUrl: avatarUrl,
                              commentsExpanded:
                                expandedCommentsPostId === entry.item.id,
                              comments: commentsByPostId[entry.item.id] ?? [],
                              commentsLoading:
                                commentsLoadingPostId === entry.item.id,
                              onAddComment: handleAddComment,
                              isLinkPreviewDismissed:
                                dismissedLinkPreviewIds.has(entry.item.id),
                              onDismissLinkPreview: () =>
                                handleDismissLinkPreview(entry.item.id),
                            }),
                          )
                        : /* @__PURE__ */ React.createElement(FeedAdCard, {
                            key: `ad-${entry.advertiser.id}-${index}`,
                            advertiser: entry.advertiser,
                            onDismiss: () =>
                              handleDismissAd(entry.advertiser.id),
                            onImpression: () =>
                              handleAdImpression(entry.advertiser, index),
                            onAdClick: (payload) =>
                              handleAdClick(entry.advertiser, index, payload),
                          }),
                    ),
                    nextCursor &&
                      /* @__PURE__ */ React.createElement(
                        Box,
                        {
                          sx: {
                            display: 'flex',
                            justifyContent: 'center',
                            py: 2,
                          },
                        },
                        /* @__PURE__ */ React.createElement(
                          Button,
                          {
                            variant: 'outlined',
                            disabled: loadingMore,
                            onClick: () => void loadPage(nextCursor, true),
                            startIcon: loadingMore
                              ? /* @__PURE__ */ React.createElement(
                                  CircularProgress,
                                  { size: 16 },
                                )
                              : null,
                          },
                          loadingMore ? 'Loading\u2026' : 'Load more',
                        ),
                      ),
                  ),
          ),
        ),
      ),
    ),
    /* @__PURE__ */ React.createElement(
      Dialog,
      {
        open: composerOpen,
        onClose: () => {
          setComposerOpen(false);
          setComposerImages([]);
          setComposerScheduledAt(null);
          setGifPickerOpen(false);
        },
        maxWidth: 'sm',
        fullWidth: true,
        PaperProps: {
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid rgba(156,187,217,0.22)',
          },
        },
      },
      /* @__PURE__ */ React.createElement(
        DialogTitle,
        {
          sx: {
            pb: 1,
            pt: 2,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(156,187,217,0.18)',
          },
        },
        /* @__PURE__ */ React.createElement(
          Stack,
          { direction: 'row', alignItems: 'center', spacing: 2 },
          /* @__PURE__ */ React.createElement(ProfileAvatar, {
            src: avatarUrl ?? void 0,
            alt: session?.user?.user_metadata?.full_name ?? 'You',
            size: 'small',
          }),
          /* @__PURE__ */ React.createElement(
            Box,
            null,
            /* @__PURE__ */ React.createElement(
              Typography,
              { variant: 'subtitle1', fontWeight: 600 },
              session?.user?.user_metadata?.full_name ?? 'You',
            ),
            /* @__PURE__ */ React.createElement(
              Typography,
              { variant: 'caption', color: 'text.secondary' },
              'Post to Anyone',
            ),
          ),
        ),
        /* @__PURE__ */ React.createElement(
          IconButton,
          {
            onClick: () => setComposerOpen(false),
            'aria-label': 'Close',
            size: 'small',
          },
          /* @__PURE__ */ React.createElement(CloseIcon, { fontSize: 'small' }),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        DialogContent,
        { sx: { pt: 2, pb: 1 } },
        /* @__PURE__ */ React.createElement(InputBase, {
          inputRef: composerRef,
          placeholder: 'Share your thoughts...',
          value: composerValue,
          onChange: (e) => setComposerValue(e.target.value),
          onKeyDown: (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSubmitPost();
            }
          },
          fullWidth: true,
          multiline: true,
          minRows: 4,
          sx: {
            bgcolor: 'transparent',
            px: 0,
            py: 0,
            fontSize: '1rem',
            '&.Mui-focused': { outline: 'none' },
          },
        }),
        composerImages.length > 0 &&
          /* @__PURE__ */ React.createElement(
            Stack,
            { direction: 'row', spacing: 1, sx: { mt: 2 }, flexWrap: 'wrap' },
            composerImages.map((url, i) =>
              /* @__PURE__ */ React.createElement(
                Box,
                { key: url, sx: { position: 'relative' } },
                /* @__PURE__ */ React.createElement(Box, {
                  component: 'img',
                  src: url,
                  alt: '',
                  sx: {
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 1,
                  },
                }),
                /* @__PURE__ */ React.createElement(
                  IconButton,
                  {
                    size: 'small',
                    onClick: () =>
                      setComposerImages((prev) =>
                        prev.filter((_, j) => j !== i),
                      ),
                    sx: {
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'action.hover' },
                    },
                    'aria-label': 'Remove image',
                  },
                  /* @__PURE__ */ React.createElement(CloseIcon, {
                    fontSize: 'small',
                  }),
                ),
              ),
            ),
          ),
        /* @__PURE__ */ React.createElement(
          Stack,
          {
            direction: 'row',
            alignItems: 'center',
            spacing: 0.75,
            sx: {
              mt: 2,
              pt: 1.5,
              borderTop: '1px solid rgba(156,187,217,0.18)',
              flexWrap: 'wrap',
              gap: 0.5,
            },
          },
          /* @__PURE__ */ React.createElement('input', {
            type: 'file',
            accept: 'image/jpeg,image/png,image/gif,image/webp',
            onChange: handleAddPostImage,
            disabled: imageUploading,
            style: { display: 'none' },
            id: 'post-image-upload',
          }),
          /* @__PURE__ */ React.createElement(
            IconButton,
            {
              component: 'label',
              htmlFor: 'post-image-upload',
              size: 'small',
              'aria-label': 'Attach image',
              disabled: imageUploading,
              sx: {
                color: 'text.secondary',
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              },
            },
            /* @__PURE__ */ React.createElement(AttachFileIcon, {
              fontSize: 'small',
            }),
          ),
          /* @__PURE__ */ React.createElement(
            IconButton,
            {
              size: 'small',
              'aria-label': 'Add GIF',
              sx: {
                color: 'text.secondary',
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              },
              onClick: () => setGifPickerOpen(true),
            },
            /* @__PURE__ */ React.createElement(GifBoxIcon, {
              fontSize: 'small',
            }),
          ),
          imageUploading &&
            /* @__PURE__ */ React.createElement(
              Stack,
              { direction: 'row', alignItems: 'center', spacing: 0.5 },
              /* @__PURE__ */ React.createElement(CircularProgress, {
                size: 14,
              }),
              /* @__PURE__ */ React.createElement(
                Typography,
                { variant: 'caption', color: 'text.secondary' },
                'Uploading\u2026',
              ),
            ),
          /* @__PURE__ */ React.createElement(
            IconButton,
            {
              size: 'small',
              'aria-label': 'Schedule post',
              sx: {
                color: 'text.secondary',
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              },
              onClick: () => {
                const d = /* @__PURE__ */ new Date();
                d.setDate(d.getDate() + 1);
                setScheduleDate(d.toISOString().slice(0, 10));
                setScheduleTime('09:30');
                setScheduleDialogOpen(true);
              },
            },
            /* @__PURE__ */ React.createElement(ScheduleIcon, {
              fontSize: 'small',
            }),
          ),
          composerScheduledAt &&
            /* @__PURE__ */ React.createElement(
              Typography,
              {
                variant: 'caption',
                color: 'primary.main',
                sx: { display: 'flex', alignItems: 'center', gap: 0.25 },
              },
              new Date(composerScheduledAt).toLocaleString(),
              /* @__PURE__ */ React.createElement(
                IconButton,
                {
                  size: 'small',
                  onClick: () => setComposerScheduledAt(null),
                  'aria-label': 'Clear schedule',
                  sx: { p: 0, ml: 0.25 },
                },
                /* @__PURE__ */ React.createElement(CloseIcon, {
                  sx: { fontSize: 14 },
                }),
              ),
            ),
          /* @__PURE__ */ React.createElement(Box, {
            sx: { flex: 1, minWidth: 8 },
          }),
          /* @__PURE__ */ React.createElement(
            Button,
            {
              variant: 'contained',
              size: 'small',
              onClick: () => void handleSubmitPost(),
              disabled: posting || imageUploading || !composerValue.trim(),
              sx: {
                textTransform: 'none',
                borderRadius: '9999px',
                px: 2.5,
                py: 0.75,
                '&:hover': { filter: 'brightness(1.08)' },
              },
            },
            posting ? 'Posting\u2026' : 'Post',
          ),
        ),
      ),
    ),
    /* @__PURE__ */ React.createElement(GifPicker.GifPickerDialog, {
      open: gifPickerOpen,
      onClose: () => setGifPickerOpen(false),
      onPick: (url) => setComposerImages((prev) => [...prev, url]),
    }),
    /* @__PURE__ */ React.createElement(
      Dialog,
      {
        open: scheduleDialogOpen,
        onClose: () => setScheduleDialogOpen(false),
        maxWidth: 'xs',
        fullWidth: true,
        PaperProps: {
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid rgba(156,187,217,0.22)',
          },
        },
      },
      /* @__PURE__ */ React.createElement(
        DialogTitle,
        {
          sx: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(156,187,217,0.18)',
            pb: 2,
          },
        },
        /* @__PURE__ */ React.createElement(
          Typography,
          { variant: 'h6', fontWeight: 600 },
          'Schedule post',
        ),
        /* @__PURE__ */ React.createElement(
          IconButton,
          {
            size: 'small',
            onClick: () => setScheduleDialogOpen(false),
            'aria-label': 'Close',
          },
          /* @__PURE__ */ React.createElement(CloseIcon, { fontSize: 'small' }),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        DialogContent,
        { sx: { pt: 2 } },
        scheduleDate &&
          scheduleTime &&
          /* @__PURE__ */ React.createElement(
            Typography,
            { variant: 'body2', color: 'text.secondary', sx: { mb: 2 } },
            /* @__PURE__ */ new Date(
              `${scheduleDate}T${scheduleTime}`,
            ).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short',
            }),
            ' ',
            'based on your location',
          ),
        /* @__PURE__ */ React.createElement(
          Stack,
          { spacing: 2 },
          /* @__PURE__ */ React.createElement(TextField, {
            label: 'Date',
            type: 'date',
            value: scheduleDate,
            onChange: (e) => setScheduleDate(e.target.value),
            fullWidth: true,
            InputLabelProps: { shrink: true },
            slotProps: {
              input: {
                sx: { color: 'text.primary' },
              },
            },
          }),
          /* @__PURE__ */ React.createElement(
            TextField,
            {
              label: 'Time',
              select: true,
              value: scheduleTime,
              onChange: (e) => setScheduleTime(e.target.value),
              fullWidth: true,
              InputProps: {
                startAdornment: /* @__PURE__ */ React.createElement(
                  InputAdornment,
                  { position: 'start' },
                  /* @__PURE__ */ React.createElement(ScheduleIcon, {
                    sx: { fontSize: 20, color: 'text.secondary' },
                  }),
                ),
              },
            },
            SCHEDULE_TIMES.map((t) => {
              const [h, m] = t.split(':').map(Number);
              const label =
                h === 0
                  ? `12:${m.toString().padStart(2, '0')} AM`
                  : h < 12
                    ? `${h}:${m.toString().padStart(2, '0')} AM`
                    : h === 12
                      ? `12:${m.toString().padStart(2, '0')} PM`
                      : `${h - 12}:${m.toString().padStart(2, '0')} PM`;
              return /* @__PURE__ */ React.createElement(
                MenuItem,
                { key: t, value: t },
                label,
              );
            }),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        DialogActions,
        { sx: { px: 2, pb: 2, gap: 1 } },
        /* @__PURE__ */ React.createElement(
          Button,
          {
            variant: 'outlined',
            onClick: () => setScheduleDialogOpen(false),
            sx: { textTransform: 'none' },
          },
          'Back',
        ),
        /* @__PURE__ */ React.createElement(
          Button,
          {
            variant: 'contained',
            onClick: () => {
              const d = /* @__PURE__ */ new Date(
                `${scheduleDate}T${scheduleTime}`,
              );
              if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
                setComposerScheduledAt(d.toISOString());
                setSnack(`Post scheduled for ${d.toLocaleString()}`);
                setScheduleDialogOpen(false);
              } else {
                setSnack('Please choose a future date and time.');
              }
            },
            sx: { textTransform: 'none' },
          },
          'Next',
        ),
      ),
    ),
    /* @__PURE__ */ React.createElement(ShareDialog, {
      item: shareModalItem,
      open: Boolean(shareModalItem),
      onClose: () => setShareModalItem(null),
      onCopyLink: handleCopyLink,
    }),
    /* @__PURE__ */ React.createElement(Snackbar, {
      open: Boolean(snack),
      autoHideDuration: 4e3,
      onClose: () => setSnack(null),
      message: snack,
      anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
    }),
  );
};
export { Feed };
