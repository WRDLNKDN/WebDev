import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
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
import type { ProfileRow } from './adminApi';
import {
  approveProfiles,
  deleteProfiles,
  disableProfiles,
  fetchProfiles,
  rejectProfiles,
} from './adminApi';
import { ProfileDetailDialog } from './ProfileDetailDialog';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'disabled' | 'all';
type SortField = 'created_at' | 'updated_at';
type SortOrder = 'asc' | 'desc';

type Props = { token: string };

type AppError = { message?: string };

function formatStatus(status: string) {
  switch (status) {
    case 'approved':
      return { label: 'Approved', color: 'success' as const };
    case 'rejected':
      return { label: 'Rejected', color: 'error' as const };
    case 'disabled':
      return { label: 'Disabled', color: 'warning' as const };
    default:
      return { label: 'Pending', color: 'default' as const };
  }
}

export const AdminModerationPage = ({ token }: Props) => {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusFilter>('pending');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<SortField>('created_at');
  const [order, setOrder] = useState<SortOrder>('asc');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<ProfileRow | null>(null);

  const [confirm, setConfirm] = useState<null | {
    title: string;
    body: string;
    action: () => Promise<void>;
    destructive?: boolean;
  }>(null);

  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(count / limit)),
    [count, limit],
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, count: c } = await fetchProfiles(token, {
        status,
        q,
        limit,
        offset,
        sort,
        order,
      });
      setRows(data);
      setCount(c);
      setSelected(new Set());
    } catch (e: unknown) {
      const err = e as AppError;
      setError(err?.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, limit, offset, sort, order]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allChecked = rows.length > 0 && rows.every((r) => next.has(r.id));
      if (allChecked) {
        rows.forEach((r) => next.delete(r.id));
      } else {
        rows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const run = async (action: () => Promise<unknown>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e: unknown) {
      const err = e as AppError;
      setError(err?.message || 'Action failed');
      setLoading(false);
    }
  };

  const bulkDisabled = selectedIds.length === 0 || loading;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Moderation
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Review profiles, approve or reject registrations, and manage active
        members.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setOffset(0);
              setStatus(e.target.value as StatusFilter);
            }}
          >
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Search"
          placeholder="handle or id"
          value={q}
          onChange={(e) => {
            setOffset(0);
            setQ(e.target.value);
          }}
          sx={{ flexGrow: 1 }}
        />

        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Sort</InputLabel>
          <Select
            label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortField)}
          >
            <MenuItem value="created_at">Created</MenuItem>
            <MenuItem value="updated_at">Updated</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Order</InputLabel>
          <Select
            label="Order"
            value={order}
            onChange={(e) => setOrder(e.target.value as SortOrder)}
          >
            <MenuItem value="asc">Oldest</MenuItem>
            <MenuItem value="desc">Newest</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Page size</InputLabel>
          <Select
            label="Page size"
            value={limit}
            onChange={(e) => {
              setOffset(0);
              setLimit(Number(e.target.value));
            }}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          disabled={bulkDisabled}
          onClick={() =>
            setConfirm({
              title: 'Approve selected profiles?',
              body: `This will approve ${selectedIds.length} profile(s).`,
              action: () => run(() => approveProfiles(token, selectedIds)),
            })
          }
        >
          Bulk approve
        </Button>
        <Button
          variant="outlined"
          disabled={bulkDisabled}
          onClick={() =>
            setConfirm({
              title: 'Reject selected profiles?',
              body: `This will reject ${selectedIds.length} profile(s).`,
              action: () => run(() => rejectProfiles(token, selectedIds)),
            })
          }
        >
          Bulk reject
        </Button>
        <Button
          variant="outlined"
          disabled={bulkDisabled}
          onClick={() =>
            setConfirm({
              title: 'Deactivate selected profiles?',
              body: `This will deactivate ${selectedIds.length} profile(s).`,
              action: () => run(() => disableProfiles(token, selectedIds)),
            })
          }
        >
          Deactivate
        </Button>
        <Button
          color="error"
          variant="outlined"
          disabled={bulkDisabled}
          onClick={() =>
            setConfirm({
              title: 'Delete selected profiles?',
              body: `This will delete ${selectedIds.length} profile row(s).`,
              action: () => run(() => deleteProfiles(token, selectedIds, false)),
              destructive: true,
            })
          }
        >
          Delete
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ position: 'relative' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.5)',
              zIndex: 2,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <OutlinedInput
                  type="checkbox"
                  value=""
                  inputProps={{ 'aria-label': 'select all' }}
                  checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell>Handle</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((r) => {
              const s = formatStatus(r.status);
              return (
                <TableRow key={r.id} hover>
                  <TableCell padding="checkbox">
                    <OutlinedInput
                      type="checkbox"
                      value=""
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      inputProps={{ 'aria-label': `select ${r.handle}` }}
                    />
                  </TableCell>

                  <TableCell sx={{ fontFamily: 'monospace' }}>{r.handle}</TableCell>

                  <TableCell>
                    <Chip size="small" label={s.label} color={s.color} />
                  </TableCell>

                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                  </TableCell>

                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
                  </TableCell>

                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => setDetails(r)}>
                      View
                    </Button>

                    {r.status !== 'approved' && (
                      <Button
                        size="small"
                        onClick={() =>
                          setConfirm({
                            title: `Approve ${r.handle}?`,
                            body: 'This will make the profile public.',
                            action: () => run(() => approveProfiles(token, [r.id])),
                          })
                        }
                      >
                        Approve
                      </Button>
                    )}

                    {r.status !== 'rejected' && (
                      <Button
                        size="small"
                        onClick={() =>
                          setConfirm({
                            title: `Reject ${r.handle}?`,
                            body: 'This will keep the profile hidden from public.',
                            action: () => run(() => rejectProfiles(token, [r.id])),
                          })
                        }
                      >
                        Reject
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography sx={{ py: 2, opacity: 0.8 }}>No results.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 2 }}
      >
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Page {page} of {pageCount} • {count} total
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            disabled={loading || offset === 0}
          >
            Previous
          </Button>
          <Button
            size="small"
            onClick={() => setOffset((o) => (o + limit < count ? o + limit : o))}
            disabled={loading || offset + limit >= count}
          >
            Next
          </Button>
        </Stack>
      </Stack>

      <ProfileDetailDialog
        open={!!details}
        profile={details}
        onClose={() => setDetails(null)}
      />

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirm?.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            color={confirm?.destructive ? 'error' : 'primary'}
            variant="contained"
            onClick={async () => {
              const action = confirm?.action;
              setConfirm(null);
              if (action) await action();
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};