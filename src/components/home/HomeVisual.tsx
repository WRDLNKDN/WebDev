import { Box } from '@mui/material';

export const HomeVisual = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1000px',
      }}
    >
      {/* Abstract Halo Effect */}
      <Box
        sx={{
          position: 'absolute',
          width: '70%',
          height: '70%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(66,165,245,0.15) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(40px)',
          zIndex: 0,
          animation: 'pulse 4s infinite ease-in-out',
          '@keyframes pulse': {
            '0%': { transform: 'scale(1)', opacity: 0.5 },
            '50%': { transform: 'scale(1.1)', opacity: 0.8 },
            '100%': { transform: 'scale(1)', opacity: 0.5 },
          },
        }}
      />

      {/* The Hero Asset */}
      <Box
        component="img"
        src="/assets/og_weirdlings/weirdling_2.png"
        alt="Community Illustration"
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))',
          transform: 'rotateY(-10deg)', // Subtle 3D effect
        }}
      />
    </Box>
  );
};
