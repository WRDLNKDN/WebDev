/**
 * Shared GIF picker dialog for Posts, Comments, and Chat.
 * Uses GIPHY API via gifApi.
 */

import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTrendingChatGifs,
  normalizeGifErrorMessage,
  PLATFORM_GIPHY_GIF_CONTENT_FILTER,
  searchChatGifs,
} from '../../../lib/chat/gifApi';
import { reportMediaTelemetryAsync } from '../../../lib/media/telemetry';

export type GifPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  onPick: (gifUrl: string, title?: string) => void;
  /** Max height for result grid (px). Default 360. */
  maxHeight?: number;
  /** Grid cell height (px). Default 110. */
  cellHeight?: number;
  /** Surface using the shared picker. Defaults to `shared_gif_picker`. */
  telemetrySurface?: string;
};

export const GifPickerDialog = ({
  open,
  onClose,
  onPick,
  maxHeight = 360,
  cellHeight = 110,
  telemetrySurface = 'shared_gif_picker',
}: GifPickerDialogProps) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<
    Array<{ id: string; title: string; previewUrl: string; gifUrl: string }>
  >([]);
  const latestRequestIdRef = useRef(0);
  const [trendingUnavailable, setTrendingUnavailable] = useState(false);
  const lastAttemptRef = useRef<{ query: string }>({ query: '' });
  /** One trending bootstrap per dialog open (avoids duplicate open telemetry / fetch if deps churn). */
  const initialTrendingDoneForOpenRef = useRef(false);

  const loadGifs = useCallback(
    async (q: string) => {
      const filter = PLATFORM_GIPHY_GIF_CONTENT_FILTER;
      const trimmedQuery = q.trim();
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      lastAttemptRef.current = { query: trimmedQuery };
      setLoading(true);
      setError(null);
      setTrendingUnavailable(false);
      try {
        const gifs = trimmedQuery
          ? await searchChatGifs(trimmedQuery, 24, filter)
          : await getTrendingChatGifs(24, filter);
        if (latestRequestIdRef.current !== requestId) return;
        setResults(gifs);
        reportMediaTelemetryAsync({
          eventName: trimmedQuery
            ? 'gif_picker_search_loaded'
            : 'gif_picker_trending_loaded',
          stage: 'preview',
          surface: telemetrySurface,
          requestId: `${filter}:${trimmedQuery || 'trending'}`,
          pipeline: 'gif_picker',
          status: 'ready',
          meta: {
            resultCount: gifs.length,
            query: trimmedQuery || null,
            filter,
          },
        });
      } catch (e) {
        if (latestRequestIdRef.current !== requestId) return;
        setResults([]);
        const raw =
          e instanceof Error ? e.message : 'Could not load GIFs. Try again.';
        const normalized = normalizeGifErrorMessage(raw);
        if (!trimmedQuery) {
          setTrendingUnavailable(true);
          setError(null);
          reportMediaTelemetryAsync({
            eventName: 'gif_picker_trending_failed',
            stage: 'preview',
            surface: telemetrySurface,
            requestId: `${filter}:trending`,
            pipeline: 'gif_picker',
            status: 'failed',
            failureCode: 'gif_trending_failed',
            failureReason: normalized,
            meta: {
              query: null,
              filter,
            },
          });
        } else {
          setError(normalized);
          reportMediaTelemetryAsync({
            eventName: 'gif_picker_search_failed',
            stage: 'preview',
            surface: telemetrySurface,
            requestId: `${filter}:${trimmedQuery}`,
            pipeline: 'gif_picker',
            status: 'failed',
            failureCode: 'gif_search_failed',
            failureReason: normalized,
            meta: {
              query: trimmedQuery,
              filter,
            },
          });
        }
      } finally {
        if (latestRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [telemetrySurface],
  );

  // Load trending once when the dialog opens — not whenever `results` becomes empty.
  // A failed search sets `results` to []; tying this effect to `results.length === 0`
  // re-fired `loadGifs('')` (trending), racing retries and leaving Search / Try again ineffective.
  useEffect(() => {
    if (!open) {
      initialTrendingDoneForOpenRef.current = false;
      return;
    }
    if (initialTrendingDoneForOpenRef.current) return;
    initialTrendingDoneForOpenRef.current = true;
    reportMediaTelemetryAsync({
      eventName: 'gif_picker_opened',
      stage: 'preview',
      surface: telemetrySurface,
      requestId: `open:${Date.now()}`,
      pipeline: 'gif_picker',
      status: 'started',
    });
    void loadGifs('');
  }, [open, loadGifs, telemetrySurface]);

  useEffect(() => {
    if (open) return;
    latestRequestIdRef.current += 1;
    initialTrendingDoneForOpenRef.current = false;
    setQuery('');
    setLoading(false);
    setError(null);
    setResults([]);
    setTrendingUnavailable(false);
    lastAttemptRef.current = { query: '' };
  }, [open]);

  const handleSearch = useCallback(
    (q: string) => {
      loadGifs(q).catch(() => {});
    },
    [loadGifs],
  );

  const handleRetry = useCallback(() => {
    const { query: lastQuery } = lastAttemptRef.current;
    loadGifs(lastQuery).catch(() => {});
  }, [loadGifs]);

  const handlePick = useCallback(
    (gifUrl: string, title?: string) => {
      onPick(gifUrl, title);
      onClose();
    },
    [onPick, onClose],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={false}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            bgcolor: 'rgba(3, 8, 20, 0.52)',
          },
        },
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid rgba(156,187,217,0.22)',
          maxHeight: { xs: '85vh', sm: '90vh' },
          m: { xs: 1, sm: 2 },
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Choose a GIF</span>
        <Tooltip title="Close">
          <span>
            <IconButton
              onClick={onClose}
              aria-label="Close"
              size="small"
              sx={{ ml: 1 }}
            >
              <CloseIcon />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <TextField
          size="small"
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch(query);
            }
          }}
          placeholder="Search GIFs"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    onClick={() => handleSearch(query)}
                    disabled={loading}
                  >
                    Search
                  </Button>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.5 }}
        />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box
            sx={{
              py: 3,
              px: 2,
              textAlign: 'center',
              bgcolor: 'action.hover',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              {error}
            </Typography>
            <Button size="small" variant="outlined" onClick={handleRetry}>
              Try again
            </Button>
          </Box>
        ) : results.length === 0 ? (
          <Box
            sx={{
              py: 3,
              px: 2,
              textAlign: 'center',
              color: 'text.secondary',
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2">
              {query.trim()
                ? 'No results found. Try a different search.'
                : trendingUnavailable
                  ? 'Trending GIFs are unavailable right now. Try searching above.'
                  : 'Search above to find a GIF.'}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 1,
              maxHeight,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {results.map((gif) => (
              <Box
                key={gif.id}
                component="button"
                type="button"
                onClick={() => handlePick(gif.gifUrl, gif.title)}
                sx={{
                  p: 0,
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  bgcolor: 'black',
                }}
              >
                <Box
                  component="img"
                  src={gif.previewUrl}
                  alt={gif.title || 'GIF'}
                  sx={{
                    width: '100%',
                    height: cellHeight,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: 'block' }}
        >
          Powered by{' '}
          <Link
            href="https://giphy.com"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.main' }}
          >
            GIPHY
          </Link>
        </Typography>
      </DialogContent>
    </Dialog>
  );
};
