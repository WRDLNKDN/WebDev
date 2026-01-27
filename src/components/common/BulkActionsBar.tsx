// src/components/BulkActionsBar.tsx

import { Button, Stack } from '@mui/material';

type Props = {
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDisable: () => void;
  onDelete: () => void;
};

export const BulkActionsBar = ({
  disabled,
  onApprove,
  onReject,
  onDisable,
  onDelete,
}: Props) => {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
      <Button variant="contained" disabled={disabled} onClick={onApprove}>
        Bulk approve
      </Button>
      <Button variant="outlined" disabled={disabled} onClick={onReject}>
        Bulk reject
      </Button>
      <Button variant="outlined" disabled={disabled} onClick={onDisable}>
        Deactivate
      </Button>
      <Button
        color="error"
        variant="outlined"
        disabled={disabled}
        onClick={onDelete}
      >
        Delete
      </Button>
    </Stack>
  );
};
