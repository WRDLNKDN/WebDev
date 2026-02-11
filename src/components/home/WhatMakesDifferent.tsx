import { Box, Container, Grid, Typography } from '@mui/material';

export const WhatMakesDifferent = () => {
  return (
    <Box
      component="section"
      aria-labelledby="what-makes-different-heading"
      sx={{
        py: 8,
        bgcolor: 'rgba(5, 7, 15, 0.95)',
        borderTop: '1px solid',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <Container maxWidth="lg">
        <Typography
          id="what-makes-different-heading"
          component="h2"
          variant="h4"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            textAlign: 'center',
            mb: 4,
          }}
        >
          What Makes This Different
        </Typography>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" sx={{ color: 'primary.light', mb: 1.5 }}>
              Values and intent
            </Typography>
            <Typography variant="body1" color="text.secondary">
              WRDLNKDN is built around shared values and clear intent. Your
              profile reflects what you care about and how you want to show up—
              so connections are meaningful, not noisy.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" sx={{ color: 'primary.light', mb: 1.5 }}>
              How participation works
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Participation is the engine. Contribute, show up, and the network
              grows with you. No algorithms pushing engagement—just people
              building a professional community on values and participation.
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
