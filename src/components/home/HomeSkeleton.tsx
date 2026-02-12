import { Box, Container, Skeleton, Stack } from '@mui/material';

export const HomeSkeleton = () => {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#05070f', // Matches Home.tsx
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 6, md: 8 }}
          alignItems="center"
          justifyContent="space-between"
        >
          {/* --- LEFT COLUMN: Text & Buttons --- */}
          <Box sx={{ width: '100%', maxWidth: { md: '550px' } }}>
            {/* Title Lines */}
            <Skeleton
              variant="text"
              width="90%"
              height={90}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                transform: 'scale(1, 0.8)',
              }}
            />
            <Skeleton
              variant="text"
              width="60%"
              height={90}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                transform: 'scale(1, 0.8)',
                mb: 2,
              }}
            />

            {/* Subtitle Lines */}
            <Skeleton
              variant="text"
              width="80%"
              height={30}
              sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}
            />
            <Skeleton
              variant="text"
              width="65%"
              height={30}
              sx={{ bgcolor: 'rgba(255,255,255,0.03)', mb: 4 }}
            />

            {/* Auth Box Skeleton (The Glass Panel) */}
            <Skeleton
              variant="rounded"
              width={320}
              height={180} // Height of the Paper containing 2 buttons + padding
              sx={{
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.05)',
                mx: { xs: 'auto', md: 0 }, // Centers on mobile to match GuestView
              }}
            />
          </Box>

          {/* --- RIGHT COLUMN: The Visual --- */}
          {/* Hidden on mobile to match the conditional rendering in Home.tsx */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <Skeleton
              variant="rounded"
              width={500}
              height={400}
              sx={{ borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)' }}
            />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};
