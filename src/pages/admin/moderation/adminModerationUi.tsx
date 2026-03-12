import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
} from '@mui/material';
import { shouldCloseDialogFromReason } from '../../../lib/ui/dialogFormUtils';
import type { ProfileRow, ProfileStatus } from '../../../types/types';
import {
  FILTER_CONTROL_MIN_HEIGHT,
  filterSelectInputSx,
} from '../../../theme/filterControls';

export const formatStatus = (status: string) => {
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

type FiltersProps = {
  status: ProfileStatus | 'all' | '';
  setStatus: (value: ProfileStatus | 'all' | '') => void;
  q: string;
  setQ: (value: string) => void;
  sort: 'created_at' | 'updated_at' | '';
  setSort: (value: 'created_at' | 'updated_at' | '') => void;
  order: 'asc' | 'desc' | '';
  setOrder: (value: 'asc' | 'desc' | '') => void;
  limit: number;
  setLimit: (value: number) => void;
  onRefresh: () => void;
  loading: boolean;
  resetOffset: () => void;
};

export const ModerationFilters = ({
  status,
  setStatus,
  q,
  setQ,
  sort,
  setSort,
  order,
  setOrder,
  limit,
  setLimit,
  onRefresh,
  loading,
  resetOffset,
}: FiltersProps) => (
  <Stack
    direction={{ xs: 'column', md: 'row' }}
    spacing={2}
    alignItems={{ md: 'center' }}
    flexWrap="wrap"
    sx={{
      mb: 2,
      '& .MuiFormControl-root': filterSelectInputSx,
      '& .MuiTextField-root .MuiInputBase-root': {
        minHeight: FILTER_CONTROL_MIN_HEIGHT,
      },
    }}
  >
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <InputLabel id="admin-mod-status">Status</InputLabel>
      <Select
        labelId="admin-mod-status"
        label="Status"
        value={status}
        displayEmpty
        renderValue={(v: ProfileStatus | 'all' | '') =>
          v === ''
            ? ''
            : v === 'all'
              ? 'All'
              : formatStatus(v as ProfileStatus).label
        }
        onChange={(e) => {
          resetOffset();
          setStatus(e.target.value as ProfileStatus | 'all' | '');
        }}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        <MenuItem value="all">All</MenuItem>
        <MenuItem value="pending">Pending</MenuItem>
        <MenuItem value="approved">Approved</MenuItem>
        <MenuItem value="rejected">Rejected</MenuItem>
        <MenuItem value="disabled">Disabled</MenuItem>
      </Select>
    </FormControl>

    <TextField
      size="small"
      label="Search"
      placeholder="handle or id"
      value={q}
      onChange={(e) => {
        resetOffset();
        setQ(e.target.value);
      }}
      sx={{ flexGrow: 1, minWidth: 160 }}
    />

    <FormControl size="small" sx={{ minWidth: 160 }}>
      <InputLabel id="admin-mod-sort">Sort</InputLabel>
      <Select
        labelId="admin-mod-sort"
        label="Sort"
        value={sort}
        displayEmpty
        renderValue={(v: 'created_at' | 'updated_at' | '') =>
          v === '' ? '' : v === 'created_at' ? 'Created' : 'Updated'
        }
        onChange={(e) =>
          setSort(e.target.value as 'created_at' | 'updated_at' | '')
        }
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        <MenuItem value="created_at">Created</MenuItem>
        <MenuItem value="updated_at">Updated</MenuItem>
      </Select>
    </FormControl>

    <FormControl size="small" sx={{ minWidth: 140 }}>
      <InputLabel id="admin-mod-order">Order</InputLabel>
      <Select
        labelId="admin-mod-order"
        label="Order"
        value={order}
        displayEmpty
        renderValue={(v: 'asc' | 'desc' | '') =>
          v === '' ? '' : v === 'asc' ? 'Oldest' : 'Newest'
        }
        onChange={(e) => setOrder(e.target.value as 'asc' | 'desc' | '')}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        <MenuItem value="asc">Oldest</MenuItem>
        <MenuItem value="desc">Newest</MenuItem>
      </Select>
    </FormControl>

    <FormControl size="small" sx={{ minWidth: 120 }}>
      <InputLabel id="admin-mod-pagesize">Page size</InputLabel>
      <Select
        labelId="admin-mod-pagesize"
        label="Page size"
        value={limit}
        onChange={(e) => {
          resetOffset();
          setLimit(Number(e.target.value));
        }}
      >
        <MenuItem value={10}>10</MenuItem>
        <MenuItem value={25}>25</MenuItem>
        <MenuItem value={50}>50</MenuItem>
      </Select>
    </FormControl>

    <Button
      size="small"
      variant="outlined"
      onClick={onRefresh}
      disabled={loading}
      sx={{ minHeight: FILTER_CONTROL_MIN_HEIGHT }}
    >
      Refresh
    </Button>
  </Stack>
);

type BulkActionsProps = {
  bulkDisabled: boolean;
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onDisable: () => void;
  onDelete: () => void;
};

export const ModerationBulkActions = ({
  bulkDisabled,
  selectedCount,
  onApprove,
  onReject,
  onDisable,
  onDelete,
}: BulkActionsProps) => (
  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
    <Button variant="contained" disabled={bulkDisabled} onClick={onApprove}>
      Bulk approve
    </Button>
    <Button variant="outlined" disabled={bulkDisabled} onClick={onReject}>
      Bulk reject
    </Button>
    <Button variant="outlined" disabled={bulkDisabled} onClick={onDisable}>
      Deactivate
    </Button>
    <Button
      color="error"
      variant="outlined"
      disabled={bulkDisabled}
      onClick={onDelete}
    >
      Delete
    </Button>
    <Typography variant="caption" sx={{ alignSelf: 'center', opacity: 0.75 }}>
      {selectedCount} selected
    </Typography>
  </Stack>
);

type TableProps = {
  loading: boolean;
  rows: ProfileRow[];
  selected: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  toggleAll: () => void;
  toggle: (id: string) => void;
  onView: (row: ProfileRow) => void;
  onApprove: (row: ProfileRow) => void;
  onReject: (row: ProfileRow) => void;
};

export const ModerationTable = ({
  loading,
  rows,
  selected,
  allChecked,
  someChecked,
  toggleAll,
  toggle,
  onView,
  onApprove,
  onReject,
}: TableProps) => (
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
        <CircularProgress aria-label="Loading..." />
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
              <TableCell>{r.handle}</TableCell>
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
                <Button size="small" onClick={() => onView(r)}>
                  View
                </Button>
                {r.status !== 'approved' && (
                  <Button size="small" onClick={() => onApprove(r)}>
                    Approve
                  </Button>
                )}
                {r.status !== 'rejected' && (
                  <Button size="small" onClick={() => onReject(r)}>
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
);

type PagerProps = {
  page: number;
  pageCount: number;
  count: number;
  loading: boolean;
  offset: number;
  limit: number;
  onPrev: () => void;
  onNext: () => void;
};

export const ModerationPager = ({
  page,
  pageCount,
  count,
  loading,
  offset,
  limit,
  onPrev,
  onNext,
}: PagerProps) => (
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
      <Button size="small" onClick={onPrev} disabled={loading || offset === 0}>
        Previous
      </Button>
      <Button
        size="small"
        onClick={onNext}
        disabled={loading || offset + limit >= count}
      >
        Next
      </Button>
    </Stack>
  </Stack>
);

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  body?: string;
  destructive?: boolean;
  showHardDelete?: boolean;
  hardDeleteAuthUsers: boolean;
  setHardDeleteAuthUsers: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ModerationConfirmDialog = ({
  open,
  title,
  body,
  destructive,
  showHardDelete,
  hardDeleteAuthUsers,
  setHardDeleteAuthUsers,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => (
  <Dialog
    open={open}
    onClose={(_event, reason) => {
      if (shouldCloseDialogFromReason(reason)) onCancel();
    }}
  >
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm();
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: showHardDelete ? 1 : 0 }}>
          {body}
        </DialogContentText>
        {showHardDelete && (
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
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          color={destructive ? 'error' : 'primary'}
          variant="contained"
        >
          Confirm
        </Button>
      </DialogActions>
    </Box>
  </Dialog>
);

export const ModerationError = ({ error }: { error: string | null }) =>
  error ? (
    <Alert severity="error" sx={{ mb: 2 }}>
      {error}
    </Alert>
  ) : null;
