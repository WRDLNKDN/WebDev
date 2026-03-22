import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';

const ECWID_SCRIPT_BASE = 'https://app.ecwid.com/script.js';

const getStoreId = (): string | undefined => {
  const id = import.meta.env.VITE_ECWID_STORE_ID;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
};

const getEcwidScriptId = (storeId: string) => `ecwid-script-${storeId}`;

/**
 * Ecwid on a React SPA must use deferred + dynamic widget init; a plain script tag
 * breaks after client navigation / Strict Mode. See Ecwid "Dynamic loading" docs.
 */
function destroyEcwidWidgets(): void {
  try {
    window.Ecwid?.destroy?.();
  } catch {
    /* Ecwid may throw if already torn down */
  }
}

function kickEcwidInit(): void {
  const run = () => {
    if (typeof window.ecwid_onBodyDone === 'function') {
      window.ecwid_onBodyDone();
      return;
    }
    window.Ecwid?.init?.();
  };
  requestAnimationFrame(() => {
    setTimeout(run, 0);
  });
}

export const Store = () => {
  const storeId = getStoreId();
  const storeDivId = useMemo(
    () => (storeId ? `my-store-${storeId}` : ''),
    [storeId],
  );

  useEffect(() => {
    if (!storeId || !storeDivId) return;

    window.ecwid_script_defer = true;
    window.ecwid_dynamic_widgets = true;

    destroyEcwidWidgets();

    window._xnext_initialization_scripts = [
      {
        widgetType: 'ProductBrowser',
        id: storeDivId,
        arg: [`id=${storeDivId}`, 'views=grid(1,60)'],
      },
    ];

    const scriptDomId = getEcwidScriptId(storeId);
    const existingScript = document.getElementById(scriptDomId);

    if (existingScript) {
      kickEcwidInit();
      return () => {
        destroyEcwidWidgets();
      };
    }

    const script = document.createElement('script');
    script.id = scriptDomId;
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = `${ECWID_SCRIPT_BASE}?${encodeURIComponent(storeId)}&data_platform=code`;

    script.onload = () => {
      kickEcwidInit();
    };
    script.onerror = () => {
      console.warn(
        '[Store] Failed to load Ecwid script. Check VITE_ECWID_STORE_ID and network.',
      );
    };

    document.body.appendChild(script);

    return () => {
      destroyEcwidWidgets();
    };
  }, [storeId, storeDivId]);

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
      <Box sx={{ minHeight: 600, position: 'relative', isolation: 'isolate' }}>
        {/*
          Minicart target required by Ecwid when using deferred init; without it,
          add-to-cart / bag UI often does not appear.
        */}
        <div
          className="ec-cart-widget"
          aria-label="Shopping cart"
          style={{ minHeight: 1 }}
        />
        <div id={storeDivId} />
      </Box>
    </Box>
  );
};

export default Store;
