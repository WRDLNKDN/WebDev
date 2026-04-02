import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminMediaHealth,
  type AdminMediaHealthSnapshot,
} from '../../../lib/api/adminMediaHealthApi';
import {
  MEDIA_REGRESSION_GUARDS,
  MEDIA_SYNTHETIC_CHECKS,
  MEDIA_VALIDATION_MATRIX,
} from '../../../lib/media/mediaQaMatrix';
import { toMessage } from '../../../lib/utils/errors';
import { useAdminSession } from '../core/AdminSessionContext';

const EMPTY_HEALTH: AdminMediaHealthSnapshot = {
  generatedAt: new Date(0).toISOString(),
  windowHours: 72,
  assetSummary: {
    totalActive: 0,
    pending: 0,
    uploading: 0,
    processing: 0,
    staleProcessing: 0,
    ready: 0,
    failed: 0,
  },
  pipelineCoverage: {
    pipelineEvents: 0,
    clientEvents: 0,
    structuredLoggingEnabled: true,
  },
  stageMetrics: [],
  surfaceMetrics: [],
  failureMetrics: {
    uploadFailures: 0,
    previewFailures: 0,
    conversionFailures: 0,
    renderFailures: 0,
    gifFailures: 0,
  },
  recentFailures: [],
};

type SummaryCardProps = {
  label: string;
  value: number;
  tone?: 'default' | 'warn' | 'error' | 'success';
};

const SummaryCard = ({ label, value, tone = 'default' }: SummaryCardProps) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: 2,
      borderColor:
        tone === 'error'
          ? 'rgba(248,113,113,0.34)'
          : tone === 'warn'
            ? 'rgba(251,191,36,0.32)'
            : tone === 'success'
              ? 'rgba(74,222,128,0.28)'
              : 'rgba(156,187,217,0.26)',
      bgcolor:
        tone === 'error'
          ? 'rgba(127,29,29,0.16)'
          : tone === 'warn'
            ? 'rgba(120,53,15,0.14)'
            : tone === 'success'
              ? 'rgba(20,83,45,0.14)'
              : 'rgba(56,132,210,0.08)',
    }}
  >
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
      {value}
    </Typography>
  </Paper>
);

export const AdminMediaHealthPage = () => {
  const session = useAdminSession();
  const token = session?.access_token ?? null;
  const [windowHours, setWindowHours] = useState(72);
  const [health, setHealth] = useState<AdminMediaHealthSnapshot>(EMPTY_HEALTH);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminMediaHealth(token, windowHours);
      setHealth(data);
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [token, windowHours]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Media Health
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            Monitor upload, preview, conversion, and render failures across the
            shared media system.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {[24, 72, 168].map((candidate) => (
            <Button
              key={candidate}
              size="small"
              variant={windowHours === candidate ? 'contained' : 'outlined'}
              onClick={() => setWindowHours(candidate)}
            >
              {candidate}h
            </Button>
          ))}
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            disabled={loading}
            onClick={() => void load()}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6, md: 3 }}>
          <SummaryCard
            label="Active assets"
            value={health.assetSummary.totalActive}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <SummaryCard
            label="Ready"
            value={health.assetSummary.ready}
            tone="success"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <SummaryCard
            label="Failed"
            value={health.assetSummary.failed}
            tone="error"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <SummaryCard
            label="Stale processing"
            value={health.assetSummary.staleProcessing}
            tone={health.assetSummary.staleProcessing > 0 ? 'warn' : 'default'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              borderColor: 'rgba(156,187,217,0.26)',
              bgcolor: 'rgba(56,132,210,0.08)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
              Failure Metrics
            </Typography>
            <Stack spacing={0.8}>
              {[
                ['Upload failures', health.failureMetrics.uploadFailures],
                ['Preview failures', health.failureMetrics.previewFailures],
                [
                  'Conversion failures',
                  health.failureMetrics.conversionFailures,
                ],
                ['Render failures', health.failureMetrics.renderFailures],
                ['GIF failures', health.failureMetrics.gifFailures],
              ].map(([label, value]) => (
                <Stack
                  key={String(label)}
                  direction="row"
                  justifyContent="space-between"
                >
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              borderColor: 'rgba(156,187,217,0.26)',
              bgcolor: 'rgba(56,132,210,0.08)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
              Telemetry Coverage
            </Typography>
            <Stack spacing={0.8}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Asset pipeline events
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {health.pipelineCoverage.pipelineEvents}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Client render/preview events
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {health.pipelineCoverage.clientEvents}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Structured logging
                </Typography>
                <Chip
                  size="small"
                  color={
                    health.pipelineCoverage.structuredLoggingEnabled
                      ? 'success'
                      : 'default'
                  }
                  label={
                    health.pipelineCoverage.structuredLoggingEnabled
                      ? 'Enabled'
                      : 'Disabled'
                  }
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Snapshot generated{' '}
                {new Date(health.generatedAt).toLocaleString()} over the last{' '}
                {health.windowHours} hours.
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: 'rgba(156,187,217,0.26)',
              bgcolor: 'rgba(17,24,39,0.56)',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Stage Metrics
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Stage</TableCell>
                  <TableCell align="right">Events</TableCell>
                  <TableCell align="right">Failures</TableCell>
                  <TableCell>Latest</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {health.stageMetrics.map((row) => (
                  <TableRow key={row.stage}>
                    <TableCell>{row.stage}</TableCell>
                    <TableCell align="right">{row.totalEvents}</TableCell>
                    <TableCell align="right">{row.failureEvents}</TableCell>
                    <TableCell>
                      {row.latestEventAt
                        ? new Date(row.latestEventAt).toLocaleString()
                        : 'No events'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: 'rgba(156,187,217,0.26)',
              bgcolor: 'rgba(17,24,39,0.56)',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Surface Metrics
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Surface</TableCell>
                  <TableCell align="right">Events</TableCell>
                  <TableCell align="right">Failures</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {health.surfaceMetrics.map((row) => (
                  <TableRow key={row.surface}>
                    <TableCell>{row.surface}</TableCell>
                    <TableCell align="right">{row.totalEvents}</TableCell>
                    <TableCell align="right">{row.failureEvents}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: 'rgba(156,187,217,0.26)',
          bgcolor: 'rgba(17,24,39,0.56)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Recent Failures
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>Stage</TableCell>
              <TableCell>Surface</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {health.recentFailures.length > 0 ? (
              health.recentFailures.map((row, index) => (
                <TableRow
                  key={`${row.createdAt ?? 'na'}:${row.eventName}:${index}`}
                >
                  <TableCell>
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : 'Unknown'}
                  </TableCell>
                  <TableCell>{row.stage}</TableCell>
                  <TableCell>{row.surface}</TableCell>
                  <TableCell>{row.eventName}</TableCell>
                  <TableCell>
                    {row.failureReason || row.failureCode || 'Unknown failure'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No recent failures in the selected window.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, xl: 6 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              borderColor: 'rgba(156,187,217,0.26)',
              bgcolor: 'rgba(56,132,210,0.08)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
              Synthetic Checks
            </Typography>
            <Stack spacing={1.2}>
              {MEDIA_SYNTHETIC_CHECKS.map((check) => (
                <Box key={check.id}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {check.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {check.coverage.toUpperCase()} • {check.surfaces.join(', ')}
                    {' • '}
                    {check.reference}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, xl: 6 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              borderColor: 'rgba(156,187,217,0.26)',
              bgcolor: 'rgba(56,132,210,0.08)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
              Regression Guards
            </Typography>
            <Stack spacing={1.2}>
              {MEDIA_REGRESSION_GUARDS.map((guard) => (
                <Box key={guard.id}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {guard.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Covered by {guard.coveredBy.join(' • ')}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: 'rgba(156,187,217,0.26)',
          bgcolor: 'rgba(17,24,39,0.56)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Browser Validation Matrix
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Platform</TableCell>
              <TableCell>Browser</TableCell>
              <TableCell>Viewport</TableCell>
              <TableCell>Surfaces</TableCell>
              <TableCell>Coverage</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MEDIA_VALIDATION_MATRIX.map((row) => (
              <TableRow key={`${row.platform}:${row.browser}:${row.viewport}`}>
                <TableCell>{row.platform}</TableCell>
                <TableCell>{row.browser}</TableCell>
                <TableCell>{row.viewport}</TableCell>
                <TableCell>{row.surfaces.join(', ')}</TableCell>
                <TableCell>{row.automation}</TableCell>
                <TableCell>{row.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
};

export default AdminMediaHealthPage;
