import { Box, Container, Grid, Skeleton, Stack } from '@mui/material';

export const HomeSkeleton = () => {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#05070f', // Match the Home.tsx background
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={8} alignItems="center">
          {/* --- LEFT COLUMN: Text & Buttons --- */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack
              spacing={4}
              sx={{ maxWidth: 520, mx: { xs: 'auto', md: 0 } }}
            >
              {/* Title Lines */}
              <Box>
                <Skeleton
                  variant="text"
                  width="80%"
                  height={80}
                  sx={{ bgcolor: 'rgba(255,255,255,0.08)', mb: 1 }}
                />
                <Skeleton
                  variant="text"
                  width="50%"
                  height={80}
                  sx={{ bgcolor: 'rgba(255,255,255,0.08)', mb: 2 }}
                />

                {/* Subtitle */}
                <Skeleton
                  variant="text"
                  width="90%"
                  height={30}
                  sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                />
              </Box>

              {/* Action Buttons (Pill Shapes) */}
              <Stack spacing={2} sx={{ pt: 2 }}>
                <Skeleton
                  variant="rounded"
                  height={56}
                  width="100%"
                  sx={{ borderRadius: 10, bgcolor: 'rgba(255,255,255,0.1)' }}
                />
                <Skeleton
                  variant="rounded"
                  height={56}
                  width="100%"
                  sx={{ borderRadius: 10, bgcolor: 'rgba(255,255,255,0.05)' }}
                />
              </Stack>
            </Stack>
          </Grid>

          {/* --- RIGHT COLUMN: The Circular Halo --- */}
          <Grid
            size={{ md: 6, xs: 12 }}
            sx={{ display: { xs: 'none', md: 'block' } }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 600,
              }}
            >
              {/* Big Circular Shimmer to mimic the Halo/Weirdling */}
              <Skeleton
                variant="circular"
                width={500}
                height={500}
                sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
