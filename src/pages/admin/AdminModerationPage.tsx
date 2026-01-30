// src/pages/admin/AdminModerationPage.tsx

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
  FormControlLabel,
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
  Checkbox,
} from '@mui/material';

import type { ProfileRow, ProfileStatus } from '../../types/types';
import {
  approveProfiles,
  deleteProfiles,
  disableProfiles,
  fetchProfiles,
  rejectProfiles,
} from './adminApi';
import { ProfileDetailDialog } from './ProfileDetailDialog';

const formatStatus = (status: string) => {
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
};

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
};

type Props = {
  token: string;
  initialStatus?: ProfileStatus | 'all';
};

type ConfirmState = null | {
  title: string;
  body: string;
  destructive?: boolean;
  showHardDelete?: boolean;
  action: (opts: { hardDeleteAuthUsers: boolean }) => Promise<void>;
};

export const AdminModerationPage = ({
  token,
  initialStatus = 'pending',
}: Props) => {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<ProfileStatus | 'all'>(initialStatus);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<'created_at' | 'updated_at'>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<ProfileRow | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [hardDeleteAuthUsers, setHardDeleteAuthUsers] = useState(false);

  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(count / limit)),
    [count, limit],
  );

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

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
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, limit, offset, sort, order]);

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
      setError(toMessage(e));
      setLoading(false);
    }
  };

  const bulkDisabled = selectedIds.length === 0 || loading;
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = rows.some((r) => selected.has(r.id));

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
              setStatus(e.target.value as ProfileStatus | 'all');
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
            onChange={(e) =>
              setSort(e.target.value as 'created_at' | 'updated_at')
            }
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
            onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}
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

        <Button
          variant="outlined"
          onClick={() => void load()}
          disabled={loading}
        >
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
              action: async () =>
                run(() => approveProfiles(token, selectedIds)),
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
              action: async () => run(() => rejectProfiles(token, selectedIds)),
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
              action: async () =>
                run(() => disableProfiles(token, selectedIds)),
            })
          }
        >
          Deactivate
        </Button>

        <Button
          color="error"
          variant="outlined"
          disabled={bulkDisabled}
          onClick={() => {
            setHardDeleteAuthUsers(false);
            setConfirm({
              title: 'Delete selected profiles?',
              body: `This will delete ${selectedIds.length} profile row(s).`,
              destructive: true,
              showHardDelete: true,
              action: async (opts) =>
                run(() =>
                  deleteProfiles(token, selectedIds, opts.hardDeleteAuthUsers),
                ),
            });
          }}
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
                <Checkbox
                  checked={allChecked}
                  indeterminate={!allChecked && someChecked}
                  onChange={toggleAll}
                  inputProps={{ 'aria-label': 'select all' }}
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
                    <Checkbox
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      inputProps={{ 'aria-label': `select ${r.handle}` }}
                    />
                  </TableCell>

                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {r.handle}
                  </TableCell>

                  <TableCell>
                    <Chip size="small" label={s.label} color={s.color} />
                  </TableCell>

                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString()
                      : '—'}
                  </TableCell>

                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {r.updated_at
                      ? new Date(r.updated_at).toLocaleString()
                      : '—'}
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
                            action: async () =>
                              run(() => approveProfiles(token, [r.id])),
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
                            action: async () =>
                              run(() => rejectProfiles(token, [r.id])),
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
                  <Typography sx={{ py: 2, opacity: 0.8 }}>
                    No results.
                  </Typography>
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
            onClick={() =>
              setOffset((o) => (o + limit < count ? o + limit : o))
            }
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

      <Dialog
        open={!!confirm}
        onClose={() => {
          setConfirm(null);
          setHardDeleteAuthUsers(false);
        }}
      >
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: confirm?.showHardDelete ? 1 : 0 }}>
            {confirm?.body}
          </DialogContentText>

          {confirm?.showHardDelete && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={hardDeleteAuthUsers}
                  onChange={(e) => setHardDeleteAuthUsers(e.target.checked)}
                />
              }
              label="Also delete auth users (dangerous)"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirm(null);
              setHardDeleteAuthUsers(false);
            }}
          >
            Cancel
          </Button>
          <Button
            color={confirm?.destructive ? 'error' : 'primary'}
            variant="contained"
            onClick={async () => {
              const action = confirm?.action;
              const hard = hardDeleteAuthUsers;
              setConfirm(null);
              setHardDeleteAuthUsers(false);
              if (action) await action({ hardDeleteAuthUsers: hard });
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
