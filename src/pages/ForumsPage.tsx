import { Box, Container, Paper, Typography } from '@mui/material';

/**
 * Forums page – browse, sort, create forums (stub for MVP).
 */
export const ForumsPage = () => (
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
          Forums
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Coming soon.
        </Typography>
      </Paper>
    </Container>
  </Box>
);
