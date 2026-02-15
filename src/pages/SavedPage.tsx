import { Box, Container, Paper, Typography } from '@mui/material';

/**
 * Saved posts list (stub for MVP).
 */
export const SavedPage = () => (
  <Box sx={{ py: 6 }}>
    <Container maxWidth="md">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Saved
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your saved posts will appear here.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Coming soon.
        </Typography>
      </Paper>
    </Container>
  </Box>
);
