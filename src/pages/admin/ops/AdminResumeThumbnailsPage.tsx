import { Alert, Box, Typography } from '@mui/material';
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
} from '../../../lib/api/contentApi';
import { toMessage } from '../../../lib/utils/errors';
import { useAdminSession } from '../core/AdminSessionContext';
import {
  FailuresTable,
  OpsToolbar,
  RunDetailsDrawer,
  RunsTable,
  SummaryBlock,
} from './adminResumeThumbnailsUi';

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
          .map(
            (key) =>
              `"${String(record[key as keyof typeof record] ?? '').replaceAll('"', '""')}"`,
          )
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

      <OpsToolbar
        backfillLimit={backfillLimit}
        setBackfillLimit={setBackfillLimit}
        backfillBusy={backfillBusy}
        onRunBackfill={() => void handleBackfill()}
        onRefresh={() => {
          void load();
          void loadRuns();
        }}
        loading={loading}
        onExportCsv={handleExportCsv}
        hasRows={rows.length > 0}
        exportRedacted={exportRedacted}
        setExportRedacted={setExportRedacted}
      />

      <SummaryBlock summary={summary} />

      <RunsTable
        runsLoading={runsLoading}
        runs={runs}
        runActionFilter={runActionFilter}
        setRunActionFilter={setRunActionFilter}
        runSearch={runSearch}
        setRunSearch={setRunSearch}
        setRunPage={setRunPage}
        openRunDetails={(runId) => void openRunDetails(runId)}
        runsTotal={runsTotal}
        runPage={runPage}
        runRowsPerPage={runRowsPerPage}
        setRunRowsPerPage={setRunRowsPerPage}
      />

      <FailuresTable
        loading={loading}
        rows={rows}
        retryingProfileId={retryingProfileId}
        onRetry={(profileId) => void handleRetry(profileId)}
      />

      <RunDetailsDrawer
        activeRunId={activeRunId}
        activeRunLoading={activeRunLoading}
        activeRunDetails={activeRunDetails}
        onClose={() => setActiveRunId(null)}
      />
    </Box>
  );
};

export default AdminResumeThumbnailsPage;
