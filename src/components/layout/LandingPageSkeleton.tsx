import { Box, Container, Paper, Skeleton, Stack } from '@mui/material';

const CARD_BG = 'rgba(30, 30, 30, 0.65)';

export const LandingPageSkeleton = () => {
  return (
    <Box sx={{ minHeight: '100dvh', py: 8 }}>
      <Container maxWidth="lg">
        {/* 1. IDENTITY HEADER SKELETON */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            bgcolor: CARD_BG,
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(156,187,217,0.22)',
            mb: 4,
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={4}
            alignItems="center"
          >
            <Skeleton
              variant="circular"
              width={140}
              height={140}
              sx={{ bgcolor: 'rgba(156,187,217,0.22)' }}
            />
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <Skeleton
                variant="text"
                width="60%"
                height={60}
                sx={{ bgcolor: 'rgba(156,187,217,0.22)', mb: 1 }}
              />
              <Skeleton
                variant="text"
                width="40%"
                height={30}
                sx={{ bgcolor: 'rgba(156,187,217,0.22)', mb: 2 }}
              />
              <Skeleton
                variant="rectangular"
                width="90%"
                height={60}
                sx={{ bgcolor: 'rgba(156,187,217,0.22)', borderRadius: 2 }}
              />
            </Box>
          </Stack>
        </Paper>

        {/* 2. CAROUSEL SKELETON */}
        <Skeleton
          variant="text"
          width={200}
          height={40}
          sx={{ mb: 3, ml: 2, bgcolor: 'rgba(156,187,217,0.22)' }}
        />
        <Stack direction="row" spacing={3} sx={{ overflow: 'hidden', px: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width={320}
              height={400}
              sx={{
                borderRadius: 3,
                bgcolor: 'rgba(56,132,210,0.12)',
                flexShrink: 0,
              }}
            />
          ))}
        </Stack>
      </Container>
    </Box>
  );
};
