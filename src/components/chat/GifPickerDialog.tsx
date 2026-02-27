/**
 * Shared GIF picker dialog for Posts, Comments, and Chat.
 * Uses Tenor API via gifApi.
 */

import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import {
  getTrendingChatGifs,
  searchChatGifs,
  type GifContentFilter,
} from '../../lib/chat/gifApi';

export type GifPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  onPick: (gifUrl: string, title?: string) => void;
  /** Show content filter buttons (G, PG-13, Strict). Default true. */
  showContentFilter?: boolean;
  /** Max height for result grid (px). Default 360. */
  maxHeight?: number;
  /** Grid cell height (px). Default 110. */
  cellHeight?: number;
};

export const GifPickerDialog = ({
  open,
  onClose,
  onPick,
  showContentFilter = true,
  maxHeight = 360,
  cellHeight = 110,
}: GifPickerDialogProps) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentFilter, setContentFilter] =
    useState<GifContentFilter>('medium');
  const [results, setResults] = useState<
    Array<{ id: string; title: string; previewUrl: string; gifUrl: string }>
  >([]);

  const loadGifs = useCallback(
    async (q: string, filter: GifContentFilter = contentFilter) => {
      setLoading(true);
      setError(null);
      try {
        const gifs = q.trim()
          ? await searchChatGifs(q.trim(), 24, filter)
          : await getTrendingChatGifs(24, filter);
        setResults(gifs);
      } catch (e) {
        setResults([]);
        setError(
          e instanceof Error ? e.message : 'Could not load GIFs. Try again.',
        );
      } finally {
        setLoading(false);
      }
    },
    [contentFilter],
  );

  useEffect(() => {
    if (open && results.length === 0) {
      void loadGifs('');
    }
  }, [open, loadGifs, results.length]);

  const handleSearch = useCallback(
    (q: string, filter?: GifContentFilter) => {
      void loadGifs(q, filter ?? contentFilter);
    },
    [loadGifs, contentFilter],
  );

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
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: { xs: '85vh', sm: '90vh' },
          m: { xs: 1, sm: 2 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>Choose a GIF</DialogTitle>
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
        {showContentFilter && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Content:
            </Typography>
            <Button
              size="small"
              variant={contentFilter === 'low' ? 'contained' : 'text'}
              onClick={() => {
                setContentFilter('low');
                handleSearch(query, 'low');
              }}
            >
              G
            </Button>
            <Button
              size="small"
              variant={contentFilter === 'medium' ? 'contained' : 'text'}
              onClick={() => {
                setContentFilter('medium');
                handleSearch(query, 'medium');
              }}
            >
              PG-13
            </Button>
            <Button
              size="small"
              variant={contentFilter === 'high' ? 'contained' : 'text'}
              onClick={() => {
                setContentFilter('high');
                handleSearch(query, 'high');
              }}
            >
              Strict
            </Button>
          </Box>
        )}
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
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleSearch(query)}
            >
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
                : 'No trending GIFs right now. Try searching above.'}
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
            href="https://tenor.com"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.main' }}
          >
            Tenor
          </Link>
        </Typography>
      </DialogContent>
    </Dialog>
  );
};
