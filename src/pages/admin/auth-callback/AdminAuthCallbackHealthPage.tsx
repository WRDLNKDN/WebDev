import { Stack, Typography } from '@mui/material';
import { AdminAuthCallbackHealthPanel } from './AdminAuthCallbackHealthPanel';

export const AdminAuthCallbackHealthPage = () => {
  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Auth Callback Health
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Review recent callback errors and timeout alerts in one dedicated
          view.
        </Typography>
      </Stack>
      <AdminAuthCallbackHealthPanel limit={30} />
    </Stack>
  );
};

export default AdminAuthCallbackHealthPage;
