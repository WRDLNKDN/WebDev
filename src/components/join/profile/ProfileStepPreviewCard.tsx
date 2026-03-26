import { Box, Typography } from '@mui/material';

function joinedLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

type ProfileStepPreviewCardProps = {
  previewName: string;
  /** Denser padding when shown in the desktop sidebar. */
  compact?: boolean;
};

export const ProfileStepPreviewCard = ({
  previewName,
  compact = false,
}: ProfileStepPreviewCardProps) => {
  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: 2.5,
        border: '1px solid rgba(100,180,230,0.35)',
        bgcolor: 'rgba(14,18,32,0.94)',
        p: compact ? { xs: 1.25, md: 1.35 } : { xs: 1.75, sm: 2 },
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: 'rgba(248,250,252,0.7)',
          letterSpacing: '0.08em',
          fontWeight: 700,
          mb: { xs: 0.45, sm: 0.75 },
          fontSize: { xs: '0.625rem', sm: '0.6875rem' },
          display: 'block',
        }}
      >
        Profile preview
      </Typography>
      <Box
        sx={{
          border: '1px solid rgba(156,187,217,0.26)',
          borderRadius: 2,
          p: compact ? 1.15 : 1.5,
          bgcolor: 'rgba(56,132,210,0.08)',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            fontSize: compact
              ? { xs: '1.05rem', md: '1.1rem' }
              : { xs: '1.1rem', sm: '1.2rem' },
            background:
              'linear-gradient(135deg, #A744C2 0%, #9d74e8 45%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 0.5,
            letterSpacing: '-0.01em',
            wordBreak: 'break-word',
          }}
        >
          {previewName}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(226,232,240,0.78)',
            mb: 0.25,
            fontSize: '0.8125rem',
          }}
        >
          Member
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'rgba(203,213,225,0.65)', fontSize: '0.75rem' }}
        >
          Joined {joinedLabel()}
        </Typography>
      </Box>
    </Box>
  );
};
