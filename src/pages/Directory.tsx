import {
  FilterList as FilterListIcon,
  Person as PersonIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
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
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// --- HIGH-FIDELITY ASSETS ---
const SYNERGY_BG = 'url("/assets/background.svg")';
const CARD_BG = 'rgba(30, 30, 30, 0.65)';
const SEARCH_BG = 'rgba(0, 0, 0, 0.4)';
// PATCH: New color for the empty state to ensure contrast against busy backgrounds
const EMPTY_STATE_BG = 'rgba(18, 18, 18, 0.8)';

// --- LOGIC HELPERS (Nick's Code) ---
type DirectoryProfile = {
  id: string;
  handle: string | null;
  pronouns: string | null;
  nerd_creds: unknown;
};

const safeString = (v: unknown): string => {
  if (typeof v === 'string') return v;
  return '';
};

const getTagline = (nerdCreds: unknown): string => {
  if (!nerdCreds || typeof nerdCreds !== 'object') return '';
  const obj = nerdCreds as Record<string, unknown>;
  return safeString(obj.tagline) || safeString(obj.additionalContext);
};

export const Directory = () => {
  // --- STATE MANAGEMENT ---
  const [rows, setRows] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(''); // Search Term

  // --- DATA FETCHING (Nick's Robust Logic) ---
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Attempt 1: Fetch Approved Profiles
        const { data, error: err } = await supabase
          .from('profiles')
          .select('id, handle, pronouns, nerd_creds')
          .eq('status', 'approved');

        if (cancelled) return;

        if (err) {
          // Fallback Logic: If 'status' column is missing, fetch all (Dev Safety Net)
          const msg = err.message.toLowerCase();
          if (msg.includes('column') && msg.includes('status')) {
            const { data: data2, error: err2 } = await supabase
              .from('profiles')
              .select('id, handle, pronouns, nerd_creds');

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
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load directory');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- FILTERING ---
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => (r.handle || '').toLowerCase().includes(term));
  }, [q, rows]);

  // --- RENDER ---
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: SYNERGY_BG,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        pt: 12,
        pb: 8,
      }}
    >
      <Container maxWidth="lg">
        {/* 1. HEADER & SEARCH HUD */}
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
                names, or operating systems. (Public Access Level)
              </Typography>
            </Box>

            {/* HUD Search Bar */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                placeholder="Search by handle..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                variant="outlined"
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
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
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
                  borderRadius: 2,
                  '&:hover': { borderColor: 'primary.main', color: 'white' },
                }}
              >
                Filters
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* 2. RESULTS AREA */}
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
            // --- EMPTY STATE (With CTA & CONTRAST FIX) ---
            <Paper
              sx={{
                p: 8,
                textAlign: 'center',
                borderRadius: 4,
                bgcolor: EMPTY_STATE_BG, // <--- PATCH: High Contrast Background
                backdropFilter: 'blur(8px)', // <--- PATCH: Blur the busy image behind
                border: '2px dashed rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Typography
                variant="h5"
                sx={{ opacity: 0.9, fontWeight: 600, color: 'white' }}
              >
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
                <br />
                Be the first to verify your operating system.
              </Typography>

              <Button
                component={RouterLink}
                to="/signup"
                variant="contained"
                size="large"
                sx={{ mt: 2, px: 4 }}
              >
                Join the Guild
              </Button>
            </Paper>
          ) : (
            // --- RESULTS LIST ---
            <Stack spacing={2}>
              {filtered.map((p) => {
                const tagline = getTagline(p.nerd_creds);
                return (
                  <Paper
                    key={p.id}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      bgcolor: CARD_BG,
                      border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <Stack direction="row" spacing={3} alignItems="center">
                      <Avatar
                        sx={{ bgcolor: 'primary.dark', width: 56, height: 56 }}
                      >
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, color: 'white' }}
                        >
                          {p.handle || '(Anonymous Entity)'}
                        </Typography>
                        {(p.pronouns || tagline) && (
                          <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary', mt: 0.5 }}
                          >
                            {[p.pronouns, tagline].filter(Boolean).join(' • ')}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      </Container>
    </Box>
  );
};
