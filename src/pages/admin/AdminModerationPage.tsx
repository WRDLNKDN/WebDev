import { Box, Typography } from '@mui/material';

type Props = {
  token: string;
  initialStatus?: string;
};

export const AdminModerationPage = ({ token, initialStatus }: Props) => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Moderation Dashboard
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Token: {token.substring(0, 20)}...
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Initial Status: {initialStatus}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, mt: 2 }}>
        Full moderation interface coming soon.
      </Typography>
    </Box>
  );
};

export default AdminModerationPage;
