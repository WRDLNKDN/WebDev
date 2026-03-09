import { Box, Container, Typography } from '@mui/material';

export const PendingProfiles = () => {
  return (
    <Box component="main" sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
          Pending Profiles
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          This page shows all pending profiles awaiting review. Functionality
          coming soon.
        </Typography>
      </Container>
    </Box>
  );
};

export default PendingProfiles;
