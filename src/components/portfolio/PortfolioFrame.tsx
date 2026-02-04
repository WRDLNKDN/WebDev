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
      sx={{ mb: 3, fontWeight: 600, pl: 2, letterSpacing: 1 }}
    >
      {title}
    </Typography>
    <Stack
      direction="row"
      spacing={3}
      sx={{
        overflowX: 'auto',
        py: 4,
        px: 2,
        scrollSnapType: 'x mandatory',
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'rgba(255,255,255,0.2)',
          borderRadius: 4,
        },
      }}
    >
      {children}
    </Stack>
  </>
);
