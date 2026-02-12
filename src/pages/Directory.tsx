import {
  FilterList as FilterListIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { DirectoryCard } from '../components/directory/DirectoryCard';
import { toMessage } from '../lib/errors';
import { supabase } from '../lib/supabaseClient';
import { safeStr } from '../utils/stringUtils';

// STYLES & ASSETS
const SYNERGY_BG = 'url("/assets/background.png")';
const CARD_BG = 'rgba(30, 30, 30, 0.65)';
const SEARCH_BG = 'rgba(0, 0, 0, 0.4)';
const EMPTY_STATE_BG = 'rgba(18, 18, 18, 0.8)';

type DirectoryProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  tagline: string | null;
  pronouns: string | null;
  nerd_creds: unknown;
};

const getTagline = (nerdCreds: unknown): string => {
  if (!nerdCreds || typeof nerdCreds !== 'object') return '';
  const obj = nerdCreds as Record<string, unknown>;
  return safeStr(obj.tagline) || safeStr(obj.additionalContext);
};

export const Directory = () => {
  /** Search term from URL so navbar search and "Discover People" links land with ?q= pre-filled and filtered. */
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const [rows, setRows] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('profiles')
          .select('id, handle, display_name, tagline, pronouns, nerd_creds')
          .eq('status', 'approved');

        if (cancelled) return;

        if (err) {
          const msg = err.message.toLowerCase();
          if (msg.includes('column') && msg.includes('status')) {
            const { data: data2, error: err2 } = await supabase
              .from('profiles')
              .select(
                'id, handle, display_name, tagline, pronouns, nerd_creds',
              );

            if (cancelled) return;
            if (err2) throw err2;
            setRows((data2 as DirectoryProfile[]) ?? []);
          } else {
            throw err;
          }
        } else {
          setRows((data as DirectoryProfile[]) ?? []);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(toMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const handle = (r.handle || '').toLowerCase();
      const displayName = (r.display_name || '').toLowerCase();
      const taglineTop = (r.tagline || '').toLowerCase();
      const taglineCreds = getTagline(r.nerd_creds).toLowerCase();
      return (
        handle.includes(term) ||
        displayName.includes(term) ||
        taglineTop.includes(term) ||
        taglineCreds.includes(term)
      );
    });
  }, [q, rows]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: SYNERGY_BG,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        pt: 12,
        pb: 8,
      }}
    >
      <Container maxWidth="lg">
        {/* HUD SEARCH SECTOR */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            bgcolor: CARD_BG,
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            mb: 4,
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                The Guild Directory
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 600 }}
              >
                A curated registry of Verified Generalists. Search for skills,
                names, or operating systems.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                placeholder="Search by name, handle, or tagline..."
                value={q}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (v.trim()) next.set('q', v.trim());
                    else next.delete('q');
                    return next;
                  });
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    bgcolor: SEARCH_BG,
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    '& fieldset': { border: 'none' },
                  },
                }}
              />
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                sx={{
                  minWidth: 120,
                  height: 56,
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'text.secondary',
                }}
              >
                Filters
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* RESULTS SECTOR */}
        <Box sx={{ minHeight: 400 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 4 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={48} />
            </Box>
          ) : filtered.length === 0 ? (
            <Paper
              sx={{
                p: 8,
                textAlign: 'center',
                borderRadius: 4,
                bgcolor: EMPTY_STATE_BG,
                backdropFilter: 'blur(8px)',
                border: '2px dashed rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'white' }}>
                No Signals Found
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.7,
                  maxWidth: 400,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                {q
                  ? `No results matching "${q}".`
                  : 'The directory is initializing.'}
                <br /> Be the first to verify your operating system.
              </Typography>
              <Button
                component={RouterLink}
                to="/join"
                variant="contained"
                size="large"
                sx={{ mt: 2, px: 4 }}
              >
                Join the Guild
              </Button>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {filtered.map((p) => (
                <DirectoryCard
                  key={p.id}
                  id={p.id}
                  handle={p.handle}
                  displayName={p.display_name}
                  pronouns={p.pronouns}
                  tagline={p.tagline || getTagline(p.nerd_creds)}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Container>
    </Box>
  );
};
