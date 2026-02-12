import { Box, Typography } from '@mui/material';
import { isUat } from '../../lib/env';

export const UatBanner = () => {
  if (!isUat) return null;

  return (
    <Box
      component="aside"
      role="banner"
      aria-label="UAT environment"
      sx={{
        py: 0.75,
        px: 2,
        bgcolor: 'warning.dark',
        color: 'warning.contrastText',
        textAlign: 'center',
        fontSize: '0.8125rem',
        fontWeight: 600,
      }}
    >
      <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
        UAT — This is a test environment. Data is not production.
      </Typography>
    </Box>
  );
};
