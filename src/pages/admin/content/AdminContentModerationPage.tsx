import { Alert, Box, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import {
  approveContent,
  fetchAdminContentSubmissions,
  fetchAdminPlaylists,
  publishContent,
  rejectContent,
  requestChangesContent,
  type ContentSubmissionRow,
} from '../../../lib/api/contentApi';
import { toMessage } from '../../../lib/utils/errors';
import { useAdminSession } from '../core/AdminSessionContext';
import {
  ModerationEmptyState,
  ModerationFilters,
  ModerationLoading,
  ModerationPagination,
  ModerationTable,
  PublishSubmissionDialog,
  RejectSubmissionDialog,
} from './contentModerationUi';

export const AdminContentModerationPage = () => {
  const session = useAdminSession();
  const token = session?.access_token ?? '';
  const [rows, setRows] = useState<ContentSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
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
    Array<{ id: string; slug: string; title: string }>
  >([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await fetchAdminContentSubmissions(token, {
        status: status === '' || status === 'all' ? undefined : status,
        q: appliedQ.trim() || undefined,
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
  }, [token, status, appliedQ, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const runRowAction = async (rowId: string, action: () => Promise<void>) => {
    setActionBusy(rowId);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setActionBusy(null);
    }
  };

  const handleApprove = async (row: ContentSubmissionRow) =>
    runRowAction(row.id, () => approveContent(token, row.id));

  const handleReject = async () => {
    if (!rejectDialog) return;
    await runRowAction(rejectDialog.id, () =>
      rejectContent(token, rejectDialog.id, rejectReason),
    );
    setRejectDialog(null);
    setRejectReason('');
  };

  const handleRequestChanges = async (row: ContentSubmissionRow) =>
    runRowAction(row.id, () => requestChangesContent(token, row.id));

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
    await runRowAction(publishDialog.id, () =>
      publishContent(token, publishDialog.id, selectedPlaylist),
    );
    setPublishDialog(null);
  };

  const runSearch = () => {
    setAppliedQ(q);
    setOffset(0);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
          Content Moderation
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Review video submissions, approve or reject, and publish to playlists.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <ModerationFilters
        status={status}
        q={q}
        loading={loading}
        onStatusChange={(nextStatus) => {
          setStatus(nextStatus);
          setOffset(0);
        }}
        onQueryChange={setQ}
        onSearch={runSearch}
      />

      {loading ? (
        <ModerationLoading />
      ) : rows.length === 0 ? (
        <ModerationEmptyState />
      ) : (
        <ModerationTable
          rows={rows}
          actionBusy={Boolean(actionBusy)}
          onApprove={handleApprove}
          onRejectOpen={setRejectDialog}
          onRequestChanges={handleRequestChanges}
          onPublishOpen={openPublishDialog}
        />
      )}

      <ModerationPagination
        offset={offset}
        limit={limit}
        total={total}
        onPrev={() => setOffset((prev) => Math.max(0, prev - limit))}
        onNext={() => setOffset((prev) => prev + limit)}
      />

      <RejectSubmissionDialog
        open={Boolean(rejectDialog)}
        reason={rejectReason}
        busy={Boolean(actionBusy)}
        onReasonChange={setRejectReason}
        onCancel={() => setRejectDialog(null)}
        onConfirm={handleReject}
      />

      <PublishSubmissionDialog
        open={Boolean(publishDialog)}
        playlists={playlists}
        selectedPlaylist={selectedPlaylist}
        busy={Boolean(actionBusy)}
        onPlaylistChange={setSelectedPlaylist}
        onCancel={() => setPublishDialog(null)}
        onConfirm={handlePublish}
      />
    </Box>
  );
};
