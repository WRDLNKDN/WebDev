import { Box, CircularProgress, Typography } from '@mui/material';
import { AdminAdvertisersTable } from './AdminAdvertisersTable';
import type {
  AdStats,
  AdvertiserRow,
  MetricsWindowDays,
} from './adminAdvertisersTypes';

type Props = {
  loading: boolean;
  rows: AdvertiserRow[];
  statsByAdvertiserId: Record<string, AdStats>;
  metricsWindowDays: MetricsWindowDays;
  onEdit: (row: AdvertiserRow) => void;
  onDelete: (id: string) => void;
  onToggleActive: (row: AdvertiserRow) => void;
};

export const AdminAdvertisersStateView = ({
  loading,
  rows,
  statsByAdvertiserId,
  metricsWindowDays,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
        <CircularProgress size={24} />
        <Typography variant="body2">Loading advertisers…</Typography>
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
        No advertisers yet. Add one to get started.
      </Typography>
    );
  }

  return (
    <AdminAdvertisersTable
      rows={rows}
      statsByAdvertiserId={statsByAdvertiserId}
      metricsWindowDays={metricsWindowDays}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleActive={onToggleActive}
    />
  );
};
