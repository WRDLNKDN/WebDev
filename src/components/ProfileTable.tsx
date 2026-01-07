// src/components/ProfileTable.tsx

import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Box,
  Typography,
} from '@mui/material';
import type { ProfileRow } from '../admin/adminApi';
import { StatusBadge } from './StatusBadge';

type Props = {
  rows: ProfileRow[];
  loading: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onView: (row: ProfileRow) => void;
  onApprove: (row: ProfileRow) => void;
  onReject: (row: ProfileRow) => void;
};

export const ProfileTable = ({
  rows,
  loading,
  selected,
  onToggle,
  onToggleAll,
  onView,
  onApprove,
  onReject,
}: Props) => {
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = rows.some((r) => selected.has(r.id));

  return (
    <Box sx={{ position: 'relative' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={allChecked}
                indeterminate={!allChecked && someChecked}
                onChange={onToggleAll}
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
          {rows.map((r) => (
            <TableRow key={r.id} hover>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selected.has(r.id)}
                  onChange={() => onToggle(r.id)}
                  inputProps={{ 'aria-label': `select ${r.handle}` }}
                />
              </TableCell>

              <TableCell sx={{ fontFamily: 'monospace' }}>{r.handle}</TableCell>

              <TableCell>
                <StatusBadge status={r.status} />
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
          ))}

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
  );
};
