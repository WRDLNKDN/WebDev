import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';

const ECWID_SCRIPT_BASE = 'https://app.ecwid.com/script.js';

const getStoreId = (): string | undefined => {
  const id = import.meta.env.VITE_ECWID_STORE_ID;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
};

export const Store = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const storeId = getStoreId();

  useEffect(() => {
    if (!storeId || !containerRef.current) return;

    const existing = document.getElementById(`ecwid-script-${storeId}`);
    if (existing) return;

    const script = document.createElement('script');
    script.id = `ecwid-script-${storeId}`;
    script.type = 'text/javascript';
    script.src = `${ECWID_SCRIPT_BASE}?${storeId}&data_platform=code`;
    script.charset = 'utf-8';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    containerRef.current.appendChild(script);

    return () => {
      script.remove();
    };
  }, [storeId]);

  if (!storeId) {
    return (
      <Box
        component="main"
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="h5" component="h1" gutterBottom>
            Store not configured
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Set <code>VITE_ECWID_STORE_ID</code> in your environment to embed
            the Ecwid storefront.
          </Typography>
          <Button component={RouterLink} to="/" variant="contained">
            Back to WRDLNKDN
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      component="main"
      sx={{ minHeight: '80vh', bgcolor: 'background.default' }}
    >
      <Box
        sx={{
          py: 2,
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Cart, checkout, and orders are handled by Ecwid. You can return here
          after checkout.
        </Typography>
        <Button
          component={RouterLink}
          to="/"
          size="small"
          variant="outlined"
          sx={{ flexShrink: 0 }}
        >
          Back to WRDLNKDN
        </Button>
      </Box>
      <Box ref={containerRef} sx={{ minHeight: 600 }}>
        <div id={`my-store-${storeId}`} />
      </Box>
    </Box>
  );
};

export default Store;
