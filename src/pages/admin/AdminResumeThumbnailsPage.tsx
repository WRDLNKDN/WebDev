import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminResumeThumbnailFailures,
  fetchAdminResumeThumbnailSummary,
  retryAdminResumeThumbnail,
  runAdminResumeThumbnailBackfill,
  type AdminResumeThumbnailFailure,
  type AdminResumeThumbnailSummary,
} from '../../lib/api/contentApi';
import { toMessage } from '../../lib/utils/errors';
import { useAdminSession } from './AdminSessionContext';

const EMPTY_SUMMARY: AdminResumeThumbnailSummary = {
  pending: 0,
  complete: 0,
  failed: 0,
  totalWithResume: 0,
  recentFailures: [],
};

export const AdminResumeThumbnailsPage = () => {
  const session = useAdminSession();
  const token = session?.access_token ?? null;
  const [summary, setSummary] =
    useState<AdminResumeThumbnailSummary>(EMPTY_SUMMARY);
  const [rows, setRows] = useState<AdminResumeThumbnailFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingProfileId, setRetryingProfileId] = useState<string | null>(
    null,
  );
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillLimit, setBackfillLimit] = useState('25');
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, failuresRes] = await Promise.all([
        fetchAdminResumeThumbnailSummary(token),
        fetchAdminResumeThumbnailFailures(token, { limit: 50, offset: 0 }),
      ]);
      setSummary(summaryRes);
      setRows(failuresRes.data);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRetry = async (profileId: string) => {
    if (!token) return;
    try {
      setRetryingProfileId(profileId);
      setFlash(null);
      await retryAdminResumeThumbnail(token, profileId);
      setFlash('Retry queued and processed successfully.');
      await load();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setRetryingProfileId(null);
    }
  };

  const handleBackfill = async () => {
    if (!token) return;
    try {
      setBackfillBusy(true);
      setFlash(null);
      const limit = Math.max(1, Math.min(200, Number(backfillLimit) || 25));
      const result = await runAdminResumeThumbnailBackfill(token, limit);
      setFlash(
        `Backfill complete: attempted ${result.attempted}, completed ${result.completed}, failed ${result.failed}.`,
      );
      await load();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBackfillBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Resume Thumbnail Ops
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>
        Backfill missing Word previews and retry failed profiles
        deterministically.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {flash && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {flash}
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          label="Backfill Batch Size"
          value={backfillLimit}
          onChange={(e) => setBackfillLimit(e.target.value)}
          sx={{ width: { xs: '100%', sm: 200 } }}
        />
        <Button
          variant="contained"
          onClick={() => void handleBackfill()}
          disabled={backfillBusy}
        >
          {backfillBusy ? 'Running Backfill...' : 'Run Backfill'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Status totals - pending: {summary.pending}, complete: {summary.complete}
        , failed: {summary.failed}, resumes: {summary.totalWithResume}
      </Typography>

      {loading ? (
        <Stack direction="row" alignItems="center" gap={1}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading resume thumbnail failures...
          </Typography>
        </Stack>
      ) : rows.length === 0 ? (
        <Alert severity="info">No failed Word thumbnail jobs right now.</Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Error</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.profileId}>
                <TableCell>
                  {row.handle ? `@${row.handle}` : row.profileId.slice(0, 8)}
                </TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.error ?? 'Unknown error'}</TableCell>
                <TableCell>{row.updatedAt ?? 'N/A'}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={retryingProfileId === row.profileId}
                    onClick={() => void handleRetry(row.profileId)}
                  >
                    {retryingProfileId === row.profileId
                      ? 'Retrying...'
                      : 'Retry'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default AdminResumeThumbnailsPage;
