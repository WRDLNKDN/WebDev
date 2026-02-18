import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Community Partners — Coming Soon placeholder.
 * Accessible from Footer when right sidebar collapses on desktop.
 */
export const CommunityPartnersPage = () => (
  <Box sx={{ py: 6 }}>
    <Container maxWidth="sm">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Community Partners
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          We&apos;re building partnerships with organizations that align with
          our mission. Check back soon.
        </Typography>
        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Back to home
        </Button>
      </Paper>
    </Container>
  </Box>
);

export default CommunityPartnersPage;
