import { Stack, Typography } from '@mui/material';
import React from 'react';

interface PortfolioFrameProps {
  title: string;
  children: React.ReactNode;
}

export const PortfolioFrame = ({ title, children }: PortfolioFrameProps) => (
  <>
    <Typography
      variant="h5"
      sx={{ mb: 3, fontWeight: 600, pl: { xs: 1, sm: 2 }, letterSpacing: 1 }}
    >
      {title}
    </Typography>
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={3}
      sx={{
        overflowX: { md: 'auto' },
        overflowY: 'visible',
        py: 4,
        px: { xs: 1, sm: 2 },
        scrollSnapType: { md: 'x mandatory' },
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'rgba(255,255,255,0.2)',
          borderRadius: 4,
        },
        '& > *': {
          flexShrink: 0,
          minWidth: { md: 280 },
          scrollSnapAlign: { md: 'start' },
        },
      }}
    >
      {children}
    </Stack>
  </>
);
