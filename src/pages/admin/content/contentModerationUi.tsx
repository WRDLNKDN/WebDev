import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import {
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
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { ContentSubmissionRow } from '../../../lib/api/contentApi';
import {
  FILTER_CONTROL_MIN_HEIGHT,
  filterSelectInputSx,
} from '../../../theme/filterControls';

export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'published', label: 'Published' },
  { value: 'all', label: 'All' },
];

export const statusColor: Record<
  string,
  'default' | 'success' | 'error' | 'warning'
> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  changes_requested: 'default',
  published: 'success',
};

type FiltersProps = {
  status: string;
  q: string;
  loading: boolean;
  onStatusChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
};

export const ModerationFilters = ({
  status,
  q,
  loading,
  onStatusChange,
  onQueryChange,
  onSearch,
}: FiltersProps) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      mb: 3,
      borderColor: 'rgba(156,187,217,0.18)',
      bgcolor: 'rgba(56,132,210,0.06)',
    }}
  >
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ sm: 'center' }}
      flexWrap="wrap"
    >
      <FormControl
        size="small"
        sx={{ minWidth: { xs: '100%', sm: 180 }, ...filterSelectInputSx }}
      >
        <InputLabel id="admin-content-status">Status</InputLabel>
        <Select
          labelId="admin-content-status"
          value={status}
          label="Status"
          displayEmpty
          renderValue={(v) =>
            v === ''
              ? ''
              : (STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v)
          }
          onChange={(e: SelectChangeEvent) => onStatusChange(e.target.value)}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {STATUS_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        placeholder="Search title..."
        value={q}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        sx={{
          minWidth: { xs: '100%', sm: 200 },
          flex: 1,
          '& .MuiInputBase-root': { minHeight: FILTER_CONTROL_MIN_HEIGHT },
        }}
      />
      <Button
        size="small"
        variant="contained"
        onClick={onSearch}
        disabled={loading}
        sx={{ minHeight: FILTER_CONTROL_MIN_HEIGHT, minWidth: 100 }}
      >
        {loading ? <CircularProgress size={22} /> : 'Search'}
      </Button>
    </Stack>
  </Paper>
);

export const ModerationEmptyState = () => (
  <Paper
    variant="outlined"
    sx={{
      py: 8,
      px: 3,
      textAlign: 'center',
      borderColor: 'rgba(156,187,217,0.18)',
      bgcolor: 'rgba(56,132,210,0.06)',
    }}
  >
    <VideoLibraryOutlinedIcon
      sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5, mb: 2 }}
    />
    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
      No submissions found
    </Typography>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ maxWidth: 360, mx: 'auto' }}
    >
      Community submissions will appear here. Try selecting &quot;All&quot; in
      the status filter, or check back when new content is submitted.
    </Typography>
  </Paper>
);

type TableProps = {
  rows: ContentSubmissionRow[];
  actionBusy: boolean;
  onApprove: (row: ContentSubmissionRow) => void;
  onRejectOpen: (row: ContentSubmissionRow) => void;
  onRequestChanges: (row: ContentSubmissionRow) => void;
  onPublishOpen: (row: ContentSubmissionRow) => void;
};

export const ModerationTable = ({
  rows,
  actionBusy,
  onApprove,
  onRejectOpen,
  onRequestChanges,
  onPublishOpen,
}: TableProps) => (
  <TableContainer
    component={Paper}
    variant="outlined"
    sx={{
      borderColor: 'rgba(156,187,217,0.26)',
      '& .MuiTableRow-root:hover': { bgcolor: 'rgba(56,132,210,0.08)' },
    }}
  >
    <Table
      size="small"
      sx={{ '& td, & th': { borderColor: 'rgba(156,187,217,0.18)' } }}
    >
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
                    onClick={() => onApprove(row)}
                    disabled={actionBusy}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    onClick={() => onRejectOpen(row)}
                    disabled={actionBusy}
                  >
                    Reject
                  </Button>
                  <Button
                    size="small"
                    onClick={() => onRequestChanges(row)}
                    disabled={actionBusy}
                  >
                    Request changes
                  </Button>
                </>
              )}
              {row.status === 'approved' && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => onPublishOpen(row)}
                  disabled={actionBusy}
                >
                  Publish
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

type PaginationProps = {
  offset: number;
  limit: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

export const ModerationPagination = ({
  offset,
  limit,
  total,
  onPrev,
  onNext,
}: PaginationProps) => {
  if (total <= limit) return null;
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ mt: 3 }}
      alignItems="center"
      justifyContent="space-between"
    >
      <Typography variant="body2" color="text.secondary">
        {offset + 1}-{Math.min(offset + limit, total)} of {total}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          disabled={offset === 0}
          onClick={onPrev}
        >
          Previous
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={offset + limit >= total}
          onClick={onNext}
        >
          Next
        </Button>
      </Stack>
    </Stack>
  );
};

type RejectDialogProps = {
  open: boolean;
  reason: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export const RejectSubmissionDialog = ({
  open,
  reason,
  busy,
  onReasonChange,
  onCancel,
  onConfirm,
}: RejectDialogProps) => (
  <Dialog open={open} onClose={onCancel}>
    <DialogTitle>Reject submission</DialogTitle>
    <DialogContent>
      <TextField
        fullWidth
        multiline
        rows={3}
        label="Reason (optional)"
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="Content does not match community guidelines."
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancel</Button>
      <Button
        color="error"
        variant="contained"
        onClick={onConfirm}
        disabled={busy}
      >
        Reject
      </Button>
    </DialogActions>
  </Dialog>
);

type PlaylistOption = { id: string; slug: string; title: string };

type PublishDialogProps = {
  open: boolean;
  playlists: PlaylistOption[];
  selectedPlaylist: string;
  busy: boolean;
  onPlaylistChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export const PublishSubmissionDialog = ({
  open,
  playlists,
  selectedPlaylist,
  busy,
  onPlaylistChange,
  onCancel,
  onConfirm,
}: PublishDialogProps) => (
  <Dialog open={open} onClose={onCancel}>
    <DialogTitle>Publish to playlist</DialogTitle>
    <DialogContent>
      <FormControl fullWidth sx={{ mt: 1 }}>
        <InputLabel>Playlist</InputLabel>
        <Select
          value={selectedPlaylist}
          label="Playlist"
          onChange={(e) => onPlaylistChange(e.target.value)}
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
      <Button onClick={onCancel}>Cancel</Button>
      <Button
        variant="contained"
        onClick={onConfirm}
        disabled={busy || !selectedPlaylist}
      >
        Publish
      </Button>
    </DialogActions>
  </Dialog>
);

export const ModerationLoading = () => (
  <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
    <CircularProgress />
  </Box>
);
