import { Box, Typography } from '@mui/material';

export const WeirdlingLoadingBar = () => {
  return (
    <Box sx={{ p: 2, bgcolor: 'background.default' }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', mb: 1, textAlign: 'center' }}
      >
        Connecting to Human OS...
      </Typography>
      <Box
        sx={{
          width: '100%',
          height: 4,
          bgcolor: 'rgba(255,255,255,0.1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'secondary.main',
            animation: 'indeterminate 1.5s infinite linear',
            '@keyframes indeterminate': {
              '0%': { transform: 'translateX(-100%)' },
              '100%': { transform: 'translateX(100%)' },
            },
          }}
        />
      </Box>
    </Box>
  );
};
