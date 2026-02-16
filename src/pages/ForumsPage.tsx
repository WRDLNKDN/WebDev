import { Box, Container, Paper, Typography } from '@mui/material';

/**
 * Groups page (route: /forums) – browse, sort, create groups (stub for MVP).
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
          Groups
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Coming soon.
        </Typography>
      </Paper>
    </Container>
  </Box>
);
