import { Box } from '@mui/material';

export const HomeVisual = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: { xs: 400, md: 600 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1000px',
      }}
    >
      {/* The "Atmosphere" Glow
        Matches the video shape (rectangular) but soft and tapered.
      */}
      <Box
        sx={{
          position: 'absolute',
          width: '80%', // Slightly smaller than video so glow tapers out
          height: '60%', // Matches approximate 16:9 ratio
          // The "Green-Pinky" Gradient to match your video content
          background:
            'linear-gradient(135deg, rgba(76, 175, 80, 0.4) 0%, rgba(233, 30, 99, 0.2) 100%)',
          filter: 'blur(60px)', // The "Tapering" effect
          zIndex: 0,
          opacity: 0.6,
          animation: 'pulse 4s infinite ease-in-out',
          '@keyframes pulse': {
            '0%': { opacity: 0.4, transform: 'scale(0.95)' },
            '50%': { opacity: 0.7, transform: 'scale(1.05)' },
            '100%': { opacity: 0.4, transform: 'scale(0.95)' },
          },
        }}
      />

      {/* The Hero Motion Asset */}
      <Box
        component="video"
        src="/assets/hero_motion.mp4"
        autoPlay
        muted
        loop
        playsInline
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '650px', // Slightly larger to dominate the right side
          height: 'auto',
          borderRadius: '12px', // Subtle rounding on the video itself
          boxShadow: '0 20px 80px rgba(0,0,0,0.5)', // Deep shadow to anchor it
        }}
      />
    </Box>
  );
};
