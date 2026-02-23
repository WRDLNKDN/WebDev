import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminResumeThumbnailFailures,
  fetchAdminResumeThumbnailRunDetails,
  fetchAdminResumeThumbnailRuns,
  fetchAdminResumeThumbnailSummary,
  retryAdminResumeThumbnail,
  runAdminResumeThumbnailBackfill,
  type AdminResumeThumbnailFailure,
  type AdminResumeThumbnailRun,
  type AdminResumeThumbnailRunDetails,
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
  backfillLock: null,
  latestBackfillRuns: [],
};

export const AdminResumeThumbnailsPage = () => {
  const session = useAdminSession();
  const token = session?.access_token ?? null;
  const [summary, setSummary] =
    useState<AdminResumeThumbnailSummary>(EMPTY_SUMMARY);
  const [rows, setRows] = useState<AdminResumeThumbnailFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingProfileId, setRetryingProfileId] = useState<string | null>(
    null,
  );
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillLimit, setBackfillLimit] = useState('25');
  const [flash, setFlash] = useState<string | null>(null);
  const [runs, setRuns] = useState<AdminResumeThumbnailRun[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runPage, setRunPage] = useState(0);
  const [runRowsPerPage, setRunRowsPerPage] = useState(10);
  const [runActionFilter, setRunActionFilter] = useState('all');
  const [runSearch, setRunSearch] = useState('');
  const [exportRedacted, setExportRedacted] = useState(true);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRunDetails, setActiveRunDetails] =
    useState<AdminResumeThumbnailRunDetails | null>(null);
  const [activeRunLoading, setActiveRunLoading] = useState(false);

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

  const loadRuns = useCallback(async () => {
    if (!token) return;
    try {
      setRunsLoading(true);
      const runRes = await fetchAdminResumeThumbnailRuns(token, {
        limit: runRowsPerPage,
        offset: runPage * runRowsPerPage,
        action: runActionFilter === 'all' ? '' : runActionFilter,
        q: runSearch.trim(),
      });
      setRuns(runRes.data);
      setRunsTotal(runRes.meta.total);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setRunsLoading(false);
    }
  }, [token, runActionFilter, runPage, runRowsPerPage, runSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

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
        `Backfill ${result.runId || '(run)'} complete in ${result.durationMs}ms: attempted ${result.attempted}, completed ${result.completed}, failed ${result.failed}.`,
      );
      await load();
      await loadRuns();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBackfillBusy(false);
    }
  };

  const handleExportCsv = () => {
    const rowsForCsv = rows.map((row) => ({
      member: row.handle ? `@${row.handle}` : row.profileId,
      profileId: exportRedacted ? '' : row.profileId,
      status: row.status,
      error: exportRedacted
        ? (row.error ?? '').replace(
            /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
            '[redacted-email]',
          )
        : (row.error ?? ''),
      updatedAt: row.updatedAt ?? '',
      resumeUrl: exportRedacted ? '' : (row.resumeUrl ?? ''),
    }));
    const header = [
      'member',
      'profileId',
      'status',
      'error',
      'updatedAt',
      'resumeUrl',
    ];
    const lines = [
      header.join(','),
      ...rowsForCsv.map((record) =>
        header
          .map((key) => {
            const value = String(record[key as keyof typeof record] ?? '');
            return `"${value.replaceAll('"', '""')}"`;
          })
          .join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-thumbnail-failures-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openRunDetails = async (runId: string) => {
    if (!token) return;
    try {
      setActiveRunId(runId);
      setActiveRunDetails(null);
      setActiveRunLoading(true);
      const detail = await fetchAdminResumeThumbnailRunDetails(token, runId);
      setActiveRunDetails(detail);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setActiveRunLoading(false);
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
      {summary.backfillLock && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Backfill lock active for run {summary.backfillLock.runId} (
          {summary.backfillLock.adminEmail ?? 'unknown admin'}) started at{' '}
          {summary.backfillLock.acquiredAt}.
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
          onClick={() => {
            void load();
            void loadRuns();
          }}
          disabled={loading}
        >
          Refresh
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCsv}
          disabled={rows.length === 0}
        >
          Export CSV {exportRedacted ? '(Redacted)' : '(Full)'}
        </Button>
        <FormControlLabel
          control={
            <Switch
              checked={exportRedacted}
              onChange={(_, checked) => setExportRedacted(checked)}
            />
          }
          label="Redact CSV"
        />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Status totals - pending: {summary.pending}, complete: {summary.complete}
        , failed: {summary.failed}, resumes: {summary.totalWithResume}
      </Typography>
      {summary.latestBackfillRuns.length > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 2, display: 'block' }}
        >
          Recent runs:{' '}
          {summary.latestBackfillRuns
            .slice(0, 3)
            .map((run) => {
              const runId = run.runId ?? run.id;
              if (run.action.endsWith('STARTED')) return `${runId} started`;
              return `${runId} ${run.action.endsWith('COMPLETED') ? 'completed' : 'failed'} (${run.completed ?? 0}/${run.attempted ?? 0})`;
            })
            .join(' | ')}
        </Typography>
      )}
      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        Backfill Run History
      </Typography>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <TextField
          size="small"
          select
          label="Action"
          value={runActionFilter}
          onChange={(e) => {
            setRunPage(0);
            setRunActionFilter(e.target.value);
          }}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="all">All actions</MenuItem>
          <MenuItem value="RESUME_THUMBNAIL_BACKFILL_STARTED">
            Backfill started
          </MenuItem>
          <MenuItem value="RESUME_THUMBNAIL_BACKFILL_COMPLETED">
            Backfill completed
          </MenuItem>
          <MenuItem value="RESUME_THUMBNAIL_BACKFILL_FAILED">
            Backfill failed
          </MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Run ID contains"
          value={runSearch}
          onChange={(e) => {
            setRunPage(0);
            setRunSearch(e.target.value);
          }}
          sx={{ minWidth: 260 }}
        />
      </Stack>
      {runsLoading ? (
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Loading run history...
          </Typography>
        </Stack>
      ) : runs.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No backfill runs recorded yet.
        </Alert>
      ) : (
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Run</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Result</TableCell>
              <TableCell>When</TableCell>
              <TableCell align="right">Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>{run.runId ?? run.id.slice(0, 8)}</TableCell>
                <TableCell>{run.action}</TableCell>
                <TableCell>
                  {run.completed ?? 0}/{run.attempted ?? 0} complete,{' '}
                  {run.failed ?? 0} failed
                </TableCell>
                <TableCell>{run.createdAt}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void openRunDetails(run.runId ?? '')}
                    disabled={!run.runId}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!runsLoading && runs.length > 0 && (
        <TablePagination
          component="div"
          count={runsTotal}
          page={runPage}
          onPageChange={(_event, page) => setRunPage(page)}
          rowsPerPage={runRowsPerPage}
          onRowsPerPageChange={(event) => {
            setRunPage(0);
            setRunRowsPerPage(Number(event.target.value));
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      )}

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
      <Drawer
        anchor="right"
        open={Boolean(activeRunId)}
        onClose={() => setActiveRunId(null)}
      >
        <Box sx={{ width: { xs: 320, sm: 460 }, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Run Details
          </Typography>
          {activeRunLoading ? (
            <Stack direction="row" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Loading run details...
              </Typography>
            </Stack>
          ) : !activeRunDetails ? (
            <Alert severity="info">No details loaded.</Alert>
          ) : (
            <Stack spacing={1.25}>
              <Typography variant="body2" color="text.secondary">
                Run ID: {activeRunDetails.runId}
              </Typography>
              {activeRunDetails.events.map((event) =>
                (() => {
                  const failedProfiles = Array.isArray(
                    event.meta.failedProfiles,
                  )
                    ? (event.meta.failedProfiles as Array<{
                        profileId?: string;
                      }>)
                    : null;
                  return (
                    <Box
                      key={event.id}
                      sx={{
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 1.5,
                        p: 1.25,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {event.action}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.createdAt}
                      </Typography>
                      {failedProfiles && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.75 }}
                        >
                          Failed profiles:{' '}
                          {failedProfiles
                            .map((item) => item.profileId ?? 'unknown')
                            .join(', ')}
                        </Typography>
                      )}
                    </Box>
                  );
                })(),
              )}
            </Stack>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default AdminResumeThumbnailsPage;
