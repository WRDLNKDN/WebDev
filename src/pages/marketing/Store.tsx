import { Box, Button, Typography } from '@mui/material';
import { useEffect } from 'react';
import { getStoreExternalUrl } from '../../lib/marketing/storefront';

/**
 * `/store` redirects to the configured storefront URL.
 */
export const Store = () => {
  const storefrontUrl = getStoreExternalUrl();

  useEffect(() => {
    window.location.replace(storefrontUrl);
  }, [storefrontUrl]);

  return (
    <Box
      component="main"
      sx={{
        width: '100%',
        minHeight: '50vh',
        px: { xs: 2, sm: 3 },
        py: { xs: 4, md: 6 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 2,
      }}
    >
      <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>
        Redirecting to the store...
      </Typography>
      <Typography sx={{ color: 'text.secondary', maxWidth: 560 }}>
        If nothing happens, use the button below to open the storefront in a new
        tab.
      </Typography>
      <Button
        component="a"
        href={storefrontUrl}
        target="_blank"
        rel="noopener noreferrer"
        variant="contained"
        size="large"
      >
        Open Store
      </Button>
    </Box>
  );
};

export default Store;
