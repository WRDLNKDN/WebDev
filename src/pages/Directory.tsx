// src/pages/Directory.tsx
//
// Public directory page.
// RLS guarantees only approved profiles are visible to anon users.
// Search is client-driven (handle ilike).

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
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
  created_at: string;
};

export const Directory = () => {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.handle.toLowerCase().includes(needle));
  }, [q, rows]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // NOTE: We do NOT filter by status here.
      // Public RLS already restricts select to status='approved'.
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, handle, pronouns, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (err) throw err;
      setRows((data ?? []) as DirectoryRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="md">
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Member directory
          </Typography>

          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Only approved profiles appear here.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Search"
            placeholder="Search by handle…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={loading}
          />

          <Paper sx={{ p: 2, borderRadius: 3 }}>
            {loading ? (
              <Typography sx={{ opacity: 0.8 }}>Loading…</Typography>
            ) : filtered.length === 0 ? (
              <Typography sx={{ opacity: 0.8 }}>No results.</Typography>
            ) : (
              <Stack spacing={1}>
                {filtered.map((r) => (
                  <Box
                    key={r.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      pb: 1,
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontFamily: 'monospace' }}>
                        {r.handle}
                      </Typography>
                      {r.pronouns && (
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          {r.pronouns}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ opacity: 0.6 }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};
