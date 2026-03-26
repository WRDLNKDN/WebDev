import { Box, Typography } from '@mui/material';

const BRAND_GRADIENT_SX = {
  background: 'linear-gradient(135deg, #A744C2 0%, #9d74e8 42%, #38bdf8 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 800,
} as const;

export type ProfileStepHeroProps = {
  /** Tighter, left-aligned headline for desktop split-column layout. */
  compact?: boolean;
};

export const ProfileStepHero = ({ compact = false }: ProfileStepHeroProps) => {
  if (compact) {
    return (
      <Box
        sx={{
          width: '100%',
          textAlign: 'left',
        }}
      >
        <Typography
          component="h2"
          sx={{
            fontWeight: 800,
            color: '#FFFFFF',
            fontSize: { xs: '1.05rem', sm: '1.15rem', md: '1.35rem' },
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            mb: { xs: 0.2, sm: 0.35 },
          }}
        >
          You&apos;re almost in.
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'rgba(255,255,255,0.82)',
            fontSize: { xs: '0.78rem', sm: '0.82rem', md: '0.875rem' },
            lineHeight: { xs: 1.35, sm: 1.4 },
          }}
        >
          Finish your profile for{' '}
          <Box component="span" sx={BRAND_GRADIENT_SX}>
            WRDLNKDN
          </Box>
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          color: '#FFFFFF',
          mb: { xs: 0.35, sm: 0.75 },
          fontSize: { xs: '1.2rem', sm: '1.75rem' },
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
          mb: { xs: 0.35, sm: 1 },
          fontSize: { xs: '0.82rem', sm: '1rem' },
        }}
      >
        Choose how you&apos;ll show up in{' '}
        <Box component="span" sx={BRAND_GRADIENT_SX}>
          WRDLNKDN
        </Box>
      </Typography>
      <Typography
        variant="body2"
        sx={{
          display: { xs: 'none', sm: 'block' },
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.5,
          fontSize: '0.8125rem',
        }}
      >
        Pick a name that feels authentic. This is how your profile will be seen
        in the community.
      </Typography>
    </Box>
  );
};
