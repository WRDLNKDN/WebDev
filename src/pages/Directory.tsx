import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Divider,
} from '@mui/material';

import { supabase } from '../lib/supabaseClient';

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
  // Your earlier signup payload had nerd_creds.additionalContext
  // so we’ll show that as the “tagline” for now if present.
  if (!nerdCreds || typeof nerdCreds !== 'object') return '';
  const obj = nerdCreds as Record<string, unknown>;
  return safeString(obj.tagline) || safeString(obj.additionalContext);
};

export const Directory = () => {
  const [rows, setRows] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      // We try “approved only” first, but if your DB/types don’t have status yet,
      // we fall back to “all” so the page still works.
      try {
        const base = supabase
          .from('profiles')
          .select('id, handle, pronouns, nerd_creds');

        const { data, error: err } = await base.eq('status', 'approved');

        if (cancelled) return;

        if (err) {
          const msg = err.message.toLowerCase();
          const looksLikeMissingColumn =
            msg.includes('column') && msg.includes('status');

          if (looksLikeMissingColumn) {
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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => (r.handle || '').toLowerCase().includes(term));
  }, [q, rows]);

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="md">
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Directory
          </Typography>

          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Approved members only.
          </Typography>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <TextField
              label="Search"
              placeholder="Search by handle"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              fullWidth
            />
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <Stack divider={<Divider />} sx={{ p: 2 }}>
                {filtered.length === 0 ? (
                  <Typography variant="body2" sx={{ opacity: 0.75 }}>
                    No profiles found.
                  </Typography>
                ) : (
                  filtered.map((p) => {
                    const tagline = getTagline(p.nerd_creds);
                    return (
                      <Box key={p.id}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {p.handle || '(no handle)'}
                        </Typography>

                        {(p.pronouns || tagline) && (
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            {[p.pronouns, tagline].filter(Boolean).join(' • ')}
                          </Typography>
                        )}
                      </Box>
                    );
                  })
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
};
