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
import type {
  AdminResumeThumbnailFailure,
  AdminResumeThumbnailRun,
  AdminResumeThumbnailRunDetails,
  AdminResumeThumbnailSummary,
} from '../../../lib/api/contentApi';

type ToolbarProps = {
  backfillLimit: string;
  setBackfillLimit: (value: string) => void;
  backfillBusy: boolean;
  onRunBackfill: () => void;
  onRefresh: () => void;
  loading: boolean;
  onExportCsv: () => void;
  hasRows: boolean;
  exportRedacted: boolean;
  setExportRedacted: (checked: boolean) => void;
};

export const OpsToolbar = ({
  backfillLimit,
  setBackfillLimit,
  backfillBusy,
  onRunBackfill,
  onRefresh,
  loading,
  onExportCsv,
  hasRows,
  exportRedacted,
  setExportRedacted,
}: ToolbarProps) => (
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
    <Button variant="contained" onClick={onRunBackfill} disabled={backfillBusy}>
      {backfillBusy ? 'Running Backfill...' : 'Run Backfill'}
    </Button>
    <Button
      variant="outlined"
      startIcon={<RefreshIcon />}
      onClick={onRefresh}
      disabled={loading}
    >
      Refresh
    </Button>
    <Button
      variant="outlined"
      startIcon={<DownloadIcon />}
      onClick={onExportCsv}
      disabled={!hasRows}
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
);

export const SummaryBlock = ({
  summary,
}: {
  summary: AdminResumeThumbnailSummary;
}) => (
  <>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Status totals - pending: {summary.pending}, complete: {summary.complete},
      failed: {summary.failed}, resumes: {summary.totalWithResume}
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
  </>
);

type RunsProps = {
  runsLoading: boolean;
  runs: AdminResumeThumbnailRun[];
  runActionFilter: string;
  setRunActionFilter: (value: string) => void;
  runSearch: string;
  setRunSearch: (value: string) => void;
  setRunPage: (value: number) => void;
  openRunDetails: (runId: string) => void;
  runsTotal: number;
  runPage: number;
  runRowsPerPage: number;
  setRunRowsPerPage: (value: number) => void;
};

export const RunsTable = ({
  runsLoading,
  runs,
  runActionFilter,
  setRunActionFilter,
  runSearch,
  setRunSearch,
  setRunPage,
  openRunDetails,
  runsTotal,
  runPage,
  runRowsPerPage,
  setRunRowsPerPage,
}: RunsProps) => (
  <>
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
                  onClick={() => openRunDetails(run.runId ?? '')}
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
  </>
);

type FailuresProps = {
  loading: boolean;
  rows: AdminResumeThumbnailFailure[];
  retryingProfileId: string | null;
  onRetry: (profileId: string) => void;
};

export const FailuresTable = ({
  loading,
  rows,
  retryingProfileId,
  onRetry,
}: FailuresProps) => {
  if (loading) {
    return (
      <Stack direction="row" alignItems="center" gap={1}>
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          Loading resume thumbnail failures...
        </Typography>
      </Stack>
    );
  }
  if (rows.length === 0)
    return (
      <Alert severity="info">No failed Word thumbnail jobs right now.</Alert>
    );
  return (
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
                onClick={() => onRetry(row.profileId)}
              >
                {retryingProfileId === row.profileId ? 'Retrying...' : 'Retry'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

type DetailsProps = {
  activeRunId: string | null;
  activeRunLoading: boolean;
  activeRunDetails: AdminResumeThumbnailRunDetails | null;
  onClose: () => void;
};

export const RunDetailsDrawer = ({
  activeRunId,
  activeRunLoading,
  activeRunDetails,
  onClose,
}: DetailsProps) => (
  <Drawer anchor="right" open={Boolean(activeRunId)} onClose={onClose}>
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
          {activeRunDetails.events.map((event) => {
            const failedProfiles = Array.isArray(event.meta.failedProfiles)
              ? (event.meta.failedProfiles as Array<{ profileId?: string }>)
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
          })}
        </Stack>
      )}
    </Box>
  </Drawer>
);
