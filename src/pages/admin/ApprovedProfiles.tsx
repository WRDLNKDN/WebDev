import { Box, Container, Typography } from '@mui/material';

export const ApprovedProfiles = () => {
  return (
    <Box component="main" sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
          Approved Profiles
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          This page shows all approved profiles. Functionality coming soon.
        </Typography>
      </Container>
    </Box>
  );
};

export default ApprovedProfiles;
