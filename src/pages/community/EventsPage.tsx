import { Box, Container, Paper, Typography } from '@mui/material';

/**
 * Events page – create event or view events (stub for MVP).
 */
export const EventsPage = () => (
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
          Events
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Create events or browse upcoming events in the community.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Coming soon.
        </Typography>
      </Paper>
    </Container>
  </Box>
);
