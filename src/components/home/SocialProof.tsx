import { Box, Container, Grid, Typography } from '@mui/material';

export const SocialProof = () => {
  return (
    <Box
      component="section"
      aria-labelledby="social-proof-heading"
      sx={{
        py: 8,
        bgcolor: 'rgba(5, 7, 15, 0.95)',
        borderTop: '1px solid',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <Container maxWidth="lg">
        <Typography
          id="social-proof-heading"
          component="h2"
          variant="h4"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            textAlign: 'center',
            mb: 4,
          }}
        >
          Community in Motion
        </Typography>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="h6" sx={{ color: 'primary.light', mb: 1.5 }}>
              Featured posts
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Real voices from the community—values-driven posts and
              conversations that show what WRDLNKDN is about.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="h6" sx={{ color: 'primary.light', mb: 1.5 }}>
              Highlighted members
            </Typography>
            <Typography variant="body1" color="text.secondary">
              People who show up: contributors, volunteers, and members building
              the network with intent and participation.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="h6" sx={{ color: 'primary.light', mb: 1.5 }}>
              Community stats
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Growth and activity metrics that reflect a living community—join
              the movement and watch it grow.
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
