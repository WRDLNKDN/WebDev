import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminAuthCallbackLogs,
  type AdminAuthCallbackLog,
} from '../../lib/api/contentApi';
import { toMessage } from '../../lib/utils/errors';
import { useAdminSession } from './AdminSessionContext';

type Props = {
  title?: string;
  limit?: number;
};

export const AdminAuthCallbackHealthPanel = ({
  title = 'Auth Callback Health',
  limit = 10,
}: Props) => {
  const session = useAdminSession();
  const token = session?.access_token ?? null;
  const [rows, setRows] = useState<AdminAuthCallbackLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const result = await fetchAdminAuthCallbackLogs(token, limit);
      setRows(result.data);
      setTotal(result.total);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  }, [limit, token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Paper
      variant="outlined"
      data-testid="admin-auth-callback-health-panel"
      sx={{
        p: 2,
        borderColor: 'rgba(255,255,255,0.12)',
        bgcolor: 'rgba(255,255,255,0.03)',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Recent callback failures/timeouts. Total records: {total}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading auth diagnostics...
          </Typography>
        </Stack>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No callback errors logged recently.
        </Typography>
      ) : (
        <Stack spacing={1} data-testid="admin-auth-callback-health-rows">
          {rows.map((row) => {
            const timedOut = Boolean(row.meta.timed_out);
            const next = String(row.meta.next ?? '');
            const provider = String(row.meta.provider ?? 'unknown');
            const elapsedMs = Number(row.meta.elapsed_ms ?? 0);
            return (
              <Box
                key={row.id}
                sx={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 1.5,
                  p: 1.25,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {row.action}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(row.createdAt).toLocaleString()} • provider:{' '}
                  {provider} • next: {next || 'n/a'} • elapsed:{' '}
                  {Number.isFinite(elapsedMs) ? `${elapsedMs}ms` : 'n/a'} •
                  timed_out: {timedOut ? 'yes' : 'no'}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
};
