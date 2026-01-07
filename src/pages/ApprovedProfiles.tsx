// src/pages/ApprovedProfiles.tsx

import { Alert, Box } from '@mui/material';
import { AdminModerationPage } from '../admin/AdminModerationPage';

const TOKEN_KEY = 'admin_token';

export const ApprovedProfiles = () => {
  const token = localStorage.getItem(TOKEN_KEY) || '';

  if (!token) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">
          No admin token found. Go to /admin and paste your admin token first.
        </Alert>
      </Box>
    );
  }

  return <AdminModerationPage token={token} initialStatus="approved" />;
};
