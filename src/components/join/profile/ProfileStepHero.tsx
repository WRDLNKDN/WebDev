import { Box, Typography } from '@mui/material';

export const ProfileStepHero = () => {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          color: '#FFFFFF',
          mb: 1,
          fontSize: { xs: '1.75rem', sm: '2.1rem' },
          letterSpacing: '-0.01em',
        }}
      >
        You&apos;re almost in.
      </Typography>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: '#FFFFFF',
          mb: 1.25,
          fontSize: { xs: '1rem', sm: '1.15rem' },
        }}
      >
        Choose how you&apos;ll show up in{' '}
        <Box
          component="span"
          sx={{
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 800,
          }}
        >
          WRDLNKDN
        </Box>
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}
      >
        Pick a name that feels authentic. This is how your profile will be seen
        in the community.
      </Typography>
    </Box>
  );
};
