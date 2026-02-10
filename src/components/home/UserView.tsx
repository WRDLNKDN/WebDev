import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface UserViewProps {
  isAdmin: boolean;
}

export const UserView = ({ isAdmin }: UserViewProps) => {
  return (
    <Stack spacing={4} sx={{ maxWidth: 520, mx: { xs: 'auto', md: 0 } }}>
      <Box>
        <Typography
          variant="h1"
          sx={{
            color: 'text.primary',
            fontWeight: 200,
            lineHeight: 1.1,
            mb: 2,
            fontSize: { xs: '2.5rem', md: '3.75rem' },
          }}
        >
          Welcome back,{' '}
          <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
            Traveler
          </Box>
        </Typography>
        <Typography
          variant="h5"
          sx={{ color: 'text.secondary', fontWeight: 400 }}
        >
          Your feed is waiting. See what&apos;s happening in the weirdverse.
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
        <Button
          component={RouterLink}
          to="/directory" // Points to Feed
          variant="contained"
          size="large"
          sx={{ borderRadius: 20, px: 4, height: 50 }}
        >
          Go to Feed
        </Button>

        {isAdmin && (
          <Button
            component={RouterLink}
            to="/admin"
            variant="outlined"
            size="large"
            sx={{ borderRadius: 20, px: 4, height: 50 }}
          >
            Admin
          </Button>
        )}
      </Stack>
    </Stack>
  );
};
