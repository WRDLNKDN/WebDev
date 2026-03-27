import { Box, Button, Typography } from '@mui/material';
import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getStoreExternalUrl } from '../../lib/marketing/storefront';

/**
 * `/store` is a handoff route. When a merch URL is configured, redirect there.
 * If not configured, show a small fallback state instead of looping back here.
 */
export const Store = () => {
  const storefrontUrl = getStoreExternalUrl();

  useEffect(() => {
    if (!storefrontUrl) return;
    window.location.replace(storefrontUrl);
  }, [storefrontUrl]);

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
