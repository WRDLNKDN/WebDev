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
      direction="row"
      flexWrap="wrap"
      spacing={2}
      useFlexGap
      sx={{
        py: 4,
        px: { xs: 1, sm: 2 },
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        '& > *': {
          flex: '1 1 auto',
          minWidth: { xs: '100%', sm: 200, md: 220 },
          maxWidth: { xs: '100%', sm: 280, md: 300 },
        },
      }}
    >
      {children}
    </Stack>
  </>
);
