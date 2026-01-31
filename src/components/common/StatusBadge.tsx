import { Chip } from '@mui/material';
import type { ProfileStatus } from '../../pages/admin/adminApi';

type Props = { status: ProfileStatus | 'all' };

export const StatusBadge = ({ status }: Props) => {
  const map: Record<
    ProfileStatus | 'all',
    { label: string; color: 'default' | 'success' | 'error' | 'warning' }
  > = {
    all: { label: 'All', color: 'default' },
    pending: { label: 'Pending', color: 'default' },
    approved: { label: 'Approved', color: 'success' },
    rejected: { label: 'Rejected', color: 'error' },
    disabled: { label: 'Disabled', color: 'warning' },
  };

  const v = map[status];
  return <Chip size="small" label={v.label} color={v.color} />;
};
