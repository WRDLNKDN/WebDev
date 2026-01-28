import {
  AppBar,
  Box,
  Container,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Toolbar,
} from '@mui/material';

export const LandingPageSkeleton = () => {
  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Navigation Layer: The Head-Up Display */}
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar>
          {/* Logo Placeholder */}
          <Skeleton
            variant="rectangular"
            width={40}
            height={40}
            sx={{ mr: 2, borderRadius: 1 }}
          />
          <Skeleton variant="text" width={120} height={32} />

          <Box sx={{ flexGrow: 1 }} />

          {/* Nav Links Placeholders */}
          <Stack direction="row" spacing={2}>
            <Skeleton variant="text" width={60} height={24} />
            <Skeleton variant="text" width={60} height={24} />
            <Skeleton variant="text" width={60} height={24} />
          </Stack>
        </Toolbar>
      </AppBar>

      {/* 2. Header (Hero) Layer: The "Hook" */}
      <Box sx={{ bgcolor: 'action.hover', py: 8 }}>
        <Container maxWidth="md">
          <Stack spacing={2} alignItems="center">
            {/* Hero Title */}
            <Skeleton
              variant="text"
              width="80%"
              height={60}
              sx={{ transform: 'scale(1)' }}
            />
            {/* Hero Subtitle */}
            <Skeleton variant="text" width="60%" height={30} />
            {/* Call to Action Button */}
            <Skeleton
              variant="rectangular"
              width={150}
              height={48}
              sx={{ borderRadius: 2, mt: 4 }}
            />
          </Stack>
        </Container>
      </Box>

      {/* 3. The Grid System: 3 Columns Across */}
      <Container sx={{ py: 8, flexGrow: 1 }} maxWidth="lg">
        <Grid container spacing={4}>
          {[1, 2, 3].map((item) => (
            <Grid key={item} size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper
                elevation={0}
                sx={{ p: 2, height: '100%', border: 1, borderColor: 'divider' }}
              >
                <Stack spacing={2}>
                  {/* Feature Image Placeholder */}
                  <Skeleton
                    variant="rectangular"
                    height={180}
                    sx={{ borderRadius: 1 }}
                  />

                  {/* Feature Title */}
                  <Skeleton variant="text" width="80%" height={32} />

                  {/* Feature Description (3 lines) */}
                  <Box>
                    <Skeleton variant="text" />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" width="60%" />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* 4. Footer Layer: The Foundation */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="sm">
          <Stack alignItems="center" spacing={1}>
            <Skeleton variant="text" width={140} height={24} />
            <Skeleton variant="text" width={200} height={20} />
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};
