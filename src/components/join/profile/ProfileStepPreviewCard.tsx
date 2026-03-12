import { Box, Typography } from '@mui/material';

function joinedLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

type ProfileStepPreviewCardProps = {
  previewName: string;
};

export const ProfileStepPreviewCard = ({
  previewName,
}: ProfileStepPreviewCardProps) => {
  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: 2.5,
        border: '1.5px solid rgba(56,189,248,0.45)',
        bgcolor: 'rgba(10,14,28,0.7)',
        p: { xs: 2.5, sm: 3 },
        backdropFilter: 'blur(20px)',
        boxShadow:
          '0 0 32px rgba(56,189,248,0.12), inset 0 1px 0 rgba(56,189,248,0.1)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 30% 0%, rgba(56,189,248,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.08em',
          fontWeight: 700,
          mb: 1,
          display: 'block',
        }}
      >
        Profile preview
      </Typography>
      <Box
        sx={{
          border: '1px solid rgba(156,187,217,0.26)',
          borderRadius: 2,
          p: 2,
          bgcolor: 'rgba(56,132,210,0.08)',
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 0.75,
            letterSpacing: '-0.01em',
            wordBreak: 'break-word',
          }}
        >
          {previewName}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'rgba(255,255,255,0.55)', mb: 0.5 }}
        >
          Member
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}
        >
          Joined {joinedLabel()}
        </Typography>
      </Box>
    </Box>
  );
};
