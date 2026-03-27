import { Box, Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  getStoreExternalUrl,
  resolveStoreExternalUrl,
} from '../../lib/marketing/storefront';

/**
 * `/store` is a handoff route. Resolves the live storefront URL (probes GoDaddy /
 * `VITE_STORE_URL` when needed) and redirects to Ecwid Instant Site if those are down.
 */
export const Store = () => {
  const [storefrontUrl, setStorefrontUrl] = useState(() =>
    getStoreExternalUrl(),
  );

  useEffect(() => {
    void resolveStoreExternalUrl().then((url) => {
      setStorefrontUrl(url);
      window.location.replace(url);
    });
  }, []);

  if (storefrontUrl) {
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
          If nothing happens, use the button below to open the merch site.
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
  }

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
        Store unavailable
      </Typography>
      <Typography sx={{ color: 'text.secondary', maxWidth: 560 }}>
        The merch site URL is not configured yet for this environment.
      </Typography>
      <Button component={RouterLink} to="/" variant="outlined" size="large">
        Back to Home
      </Button>
    </Box>
  );
};

export default Store;
