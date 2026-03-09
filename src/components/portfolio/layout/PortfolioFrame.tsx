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
      sx={{
        mb: { xs: 2.5, sm: 3.5 },
        fontWeight: 600,
        pl: { xs: 0.5, sm: 2 },
        letterSpacing: 1,
      }}
    >
      {title}
    </Typography>
    <Stack
      spacing={{ xs: 2, sm: 2.5, md: 3 }}
      sx={{
        py: { xs: 2, sm: 3.25, md: 4.5 },
        px: { xs: 0.25, sm: 1.5, md: 2 },
        minWidth: 0,
      }}
    >
      {children}
    </Stack>
  </>
);
