import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type {
  AdStats,
  AdvertiserRow,
  MetricsWindowDays,
} from './adminAdvertisersTypes';
import { getCtr } from './adminAdvertisersTypes';
import { compactGlassDangerIconButtonSx } from '../../../theme/iconActionStyles';

type Props = {
  rows: AdvertiserRow[];
  statsByAdvertiserId: Record<string, AdStats>;
  metricsWindowDays: MetricsWindowDays;
  onEdit: (row: AdvertiserRow) => void;
  onDelete: (id: string) => void;
  onToggleActive: (row: AdvertiserRow) => void;
};

export const AdminAdvertisersTable = ({
  rows,
  statsByAdvertiserId,
  metricsWindowDays,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) => (
  <Table
    size="small"
    sx={{ '& td, & th': { borderColor: 'rgba(255,255,255,0.12)' } }}
  >
    <TableHead>
      <TableRow>
        <TableCell sx={{ width: 56 }}>Image</TableCell>
        <TableCell>Company</TableCell>
        <TableCell>Title</TableCell>
        <TableCell>URL</TableCell>
        <TableCell>Status</TableCell>
        <TableCell align="right">{`Impressions (${metricsWindowDays}d)`}</TableCell>
        <TableCell align="right">{`Clicks (${metricsWindowDays}d)`}</TableCell>
        <TableCell align="right">CTR</TableCell>
        <TableCell align="right">Order</TableCell>
        <TableCell align="right">Actions</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.map((row) => {
        const stats = statsByAdvertiserId[row.id];
        return (
          <TableRow key={row.id}>
            <TableCell sx={{ width: 56, py: 0.5 }}>
              {row.image_url ? (
                <Box
                  component="img"
                  src={row.image_url}
                  alt=""
                  sx={{
                    width: 48,
                    height: 32,
                    objectFit: 'cover',
                    borderRadius: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 48,
                    height: 32,
                    borderRadius: 0.5,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.disabled">
                    —
                  </Typography>
                </Box>
              )}
            </TableCell>
            <TableCell>{row.company_name}</TableCell>
            <TableCell>{row.title}</TableCell>
            <TableCell>
              <Typography
                variant="body2"
                sx={{
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={row.url}
              >
                {row.url}
              </Typography>
            </TableCell>
            <TableCell>
              <Chip
                label={row.active ? 'Active' : 'Inactive'}
                size="small"
                color={row.active ? 'success' : 'default'}
                variant="outlined"
                onClick={() => onToggleActive(row)}
                sx={{ cursor: 'pointer' }}
              />
            </TableCell>
            <TableCell align="right">{stats?.impressions ?? 0}</TableCell>
            <TableCell align="right">{stats?.clicks ?? 0}</TableCell>
            <TableCell align="right">{getCtr(stats)}</TableCell>
            <TableCell align="right">{row.sort_order}</TableCell>
            <TableCell align="right">
              <IconButton
                size="small"
                onClick={() => onEdit(row)}
                aria-label="Edit"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete(row.id)}
                aria-label="Delete"
                sx={{
                  ...compactGlassDangerIconButtonSx,
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);
