import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { supabase } from '../lib/supabaseClient';

type DirectoryRow = {
  id: string;
  handle: string;
  pronouns: string | null;
  geek_creds: string[] | null;
  socials: unknown | null;
};

const toMessage = (e: unknown) => (e instanceof Error ? e.message : 'Error');

export const Directory = () => {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredLabel = useMemo(
    () => (q.trim() ? `for "${q.trim()}"` : ''),
    [q],
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        // RLS policy should already enforce: only approved rows for anon users.
        // We also add an explicit status filter here so intent is clear.
        let query = supabase
          .from('profiles')
          .select('id, handle, pronouns, geek_creds, socials')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(100);

        const trimmed = q.trim();
        if (trimmed) {
          query = query.ilike('handle', `%${trimmed}%`);
        }

        const { data, error: supaErr } = await query;
        if (supaErr) throw supaErr;

        setRows((data || []) as DirectoryRow[]);
      } catch (e: unknown) {
        setError(toMessage(e));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [q]);

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="md">
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Directory
          </Typography>

          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Showing approved profiles only {filteredLabel}.
          </Typography>

          <TextField
            label="Search by handle"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ex: raccoonOps"
          />
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Paper
          variant="outlined"
          sx={{ p: 2, borderRadius: 3, position: 'relative' }}
        >
          {loading && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 3,
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {!loading && rows.length === 0 && (
            <Typography sx={{ opacity: 0.8 }}>
              No approved profiles yet.
            </Typography>
          )}

          {!loading &&
            rows.map((r) => (
              <Box
                key={r.id}
                sx={{
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {r.handle}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {r.pronouns || '—'}
                </Typography>
              </Box>
            ))}
        </Paper>
      </Container>
    </Box>
  );
};
