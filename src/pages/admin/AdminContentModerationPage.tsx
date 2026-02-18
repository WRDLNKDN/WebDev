// src/pages/admin/AdminContentModerationPage.tsx

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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
  approveContent,
  fetchAdminContentSubmissions,
  fetchAdminPlaylists,
  publishContent,
  rejectContent,
  requestChangesContent,
  type ContentSubmissionRow,
} from '../../lib/api/contentApi';
import { toMessage } from '../../lib/utils/errors';
import { useAdminSession } from './AdminSessionContext';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'published', label: 'Published' },
  { value: 'all', label: 'All' },
];

const statusColor: Record<string, 'default' | 'success' | 'error' | 'warning'> =
  {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    changes_requested: 'default',
    published: 'success',
  };

export const AdminContentModerationPage = () => {
  const session = useAdminSession();
  const token = session?.access_token ?? '';
  const [rows, setRows] = useState<ContentSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 25;
  const [total, setTotal] = useState(0);

  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<ContentSubmissionRow | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState('');
  const [publishDialog, setPublishDialog] =
    useState<ContentSubmissionRow | null>(null);
  const [playlists, setPlaylists] = useState<
    { id: string; slug: string; title: string }[]
  >([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await fetchAdminContentSubmissions(token, {
        status: status === 'all' ? undefined : status,
        q: q.trim() || undefined,
        limit,
        offset,
      });
      setRows(data);
      setTotal(meta.total);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
    // q omitted: Search button triggers load manually (including q would fetch on every keystroke)
  }, [token, status, offset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (row: ContentSubmissionRow) => {
    setActionBusy(row.id);
    setError(null);
    try {
      await approveContent(token, row.id);
      await load();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setActionBusy(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setActionBusy(rejectDialog.id);
    setError(null);
    try {
      await rejectContent(token, rejectDialog.id, rejectReason);
      setRejectDialog(null);
      setRejectReason('');
      await load();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setActionBusy(null);
    }
  };

  const handleRequestChanges = async (row: ContentSubmissionRow) => {
    setActionBusy(row.id);
    setError(null);
    try {
      await requestChangesContent(token, row.id);
      await load();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setActionBusy(null);
    }
  };

  const openPublishDialog = async (row: ContentSubmissionRow) => {
    setPublishDialog(row);
    setSelectedPlaylist('');
    try {
      const list = await fetchAdminPlaylists(token);
      setPlaylists(list);
      setSelectedPlaylist(list[0]?.id ?? '');
    } catch (e) {
      setError(toMessage(e));
    }
  };

  const handlePublish = async () => {
    if (!publishDialog || !selectedPlaylist) return;
    setActionBusy(publishDialog.id);
    setError(null);
    try {
      await publishContent(token, publishDialog.id, selectedPlaylist);
      setPublishDialog(null);
      await load();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Content Moderation
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            label="Status"
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Search title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          sx={{ minWidth: 200 }}
        />
        <Button variant="outlined" onClick={load} disabled={loading}>
          Search
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }}>
          No submissions found.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Submitted by</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.title}</TableCell>
                <TableCell>
                  {row.submittedBy.displayName ??
                    row.submittedBy.handle ??
                    row.submittedBy.id}
                </TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>
                  <Chip
                    label={row.status}
                    size="small"
                    color={statusColor[row.status] ?? 'default'}
                  />
                </TableCell>
                <TableCell>
                  {new Date(row.submittedAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  {row.status === 'pending' && (
                    <>
                      <Button
                        size="small"
                        color="success"
                        onClick={() => handleApprove(row)}
                        disabled={!!actionBusy}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setRejectDialog(row)}
                        disabled={!!actionBusy}
                      >
                        Reject
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleRequestChanges(row)}
                        disabled={!!actionBusy}
                      >
                        Request changes
                      </Button>
                    </>
                  )}
                  {row.status === 'approved' && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => openPublishDialog(row)}
                      disabled={!!actionBusy}
                    >
                      Publish
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {total > limit && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            size="small"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            Previous
          </Button>
          <Button
            size="small"
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
          >
            Next
          </Button>
        </Stack>
      )}

      <Dialog open={!!rejectDialog} onClose={() => setRejectDialog(null)}>
        <DialogTitle>Reject submission</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Content does not match community guidelines."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleReject}
            disabled={!!actionBusy}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!publishDialog} onClose={() => setPublishDialog(null)}>
        <DialogTitle>Publish to playlist</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Playlist</InputLabel>
            <Select
              value={selectedPlaylist}
              label="Playlist"
              onChange={(e) => setSelectedPlaylist(e.target.value)}
            >
              {playlists.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.title} ({p.slug})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePublish}
            disabled={!!actionBusy || !selectedPlaylist}
          >
            Publish
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
