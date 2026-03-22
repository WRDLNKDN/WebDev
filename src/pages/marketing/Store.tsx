import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  buildEcwidProductBrowserInit,
  GODADDY_STOREFRONT_URL,
  getEcwidScriptId,
  getEcwidStoreDivId,
  getEcwidStoreId,
} from '../../lib/marketing/storefront';

const ECWID_SCRIPT_BASE = 'https://app.ecwid.com/script.js';
const ECWID_RENDER_TIMEOUT_MS = 12000;

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
  const storeId = getEcwidStoreId();
  const storeDivId = storeId ? getEcwidStoreDivId(storeId) : '';
  const storeRootRef = useRef<HTMLDivElement | null>(null);
  const cartWidgetRef = useRef<HTMLDivElement | null>(null);
  const [embedStatus, setEmbedStatus] = useState<'idle' | 'loading' | 'ready'>(
    storeId ? 'loading' : 'idle',
  );
  const [embedError, setEmbedError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId || !storeDivId) {
      setEmbedStatus('idle');
      setEmbedError(null);
      return;
    }

    const storeRoot = storeRootRef.current;
    const cartWidget = cartWidgetRef.current;
    if (!storeRoot || !cartWidget) return;

    setEmbedStatus('loading');
    setEmbedError(null);

    window.ecwid_script_defer = true;
    window.ecwid_dynamic_widgets = true;

    destroyEcwidWidgets();
    storeRoot.replaceChildren();
    cartWidget.replaceChildren();

    window._xnext_initialization_scripts =
      buildEcwidProductBrowserInit(storeDivId);

    const markReady = () => {
      setEmbedStatus('ready');
      setEmbedError(null);
    };

    const hasRenderedStore = () =>
      storeRoot.childElementCount > 0 || cartWidget.childElementCount > 0;

    const observer = new MutationObserver(() => {
      if (hasRenderedStore()) {
        markReady();
      }
    });

    observer.observe(storeRoot, { childList: true, subtree: true });
    observer.observe(cartWidget, { childList: true, subtree: true });

    const scriptDomId = getEcwidScriptId(storeId);
    const existingScript = document.getElementById(scriptDomId);
    const renderTimeout = window.setTimeout(() => {
      if (!hasRenderedStore()) {
        setEmbedError(
          'The embedded storefront is taking longer than expected to load.',
        );
      }
    }, ECWID_RENDER_TIMEOUT_MS);

    if (existingScript) {
      kickEcwidInit();
      if (hasRenderedStore()) {
        markReady();
      }
      return () => {
        observer.disconnect();
        window.clearTimeout(renderTimeout);
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
      setEmbedStatus('idle');
      setEmbedError(
        'The embedded storefront could not be loaded. The backup storefront is still available.',
      );
      console.warn(
        '[Store] Failed to load Ecwid script. Check VITE_ECWID_STORE_ID and network.',
      );
    };

    document.body.appendChild(script);

    return () => {
      observer.disconnect();
      window.clearTimeout(renderTimeout);
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              href={GODADDY_STOREFRONT_URL}
              target="_blank"
              rel="noreferrer"
              variant="contained"
            >
              Open backup storefront
            </Button>
            <Button component={RouterLink} to="/" variant="outlined">
              Back to WRDLNKDN
            </Button>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      component="main"
      sx={{ minHeight: '80vh', bgcolor: 'background.default' }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h3" component="h1" gutterBottom>
                Store
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Shop inside WRDLNKDN. Cart and checkout stay powered by Ecwid,
                while the GoDaddy storefront remains live as a backup.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button
                href={GODADDY_STOREFRONT_URL}
                target="_blank"
                rel="noreferrer"
                variant="outlined"
              >
                Backup storefront
              </Button>
              <Button component={RouterLink} to="/" variant="outlined">
                Back to WRDLNKDN
              </Button>
            </Stack>
          </Stack>

          {embedError ? (
            <Alert
              severity="warning"
              action={
                <Button
                  href={GODADDY_STOREFRONT_URL}
                  target="_blank"
                  rel="noreferrer"
                  color="inherit"
                  size="small"
                >
                  Open backup
                </Button>
              }
            >
              {embedError}
            </Alert>
          ) : null}

          <Box
            sx={{
              minHeight: 600,
              position: 'relative',
              isolation: 'isolate',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            {embedStatus !== 'ready' ? (
              <Stack
                spacing={1.5}
                alignItems="center"
                justifyContent="center"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1,
                  bgcolor: 'rgba(255,255,255,0.88)',
                }}
              >
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary">
                  Loading the WRDLNKDN storefront...
                </Typography>
              </Stack>
            ) : null}
            {/*
          Minicart target required by Ecwid when using deferred init; without it,
          add-to-cart / bag UI often does not appear.
        */}
            <div
              ref={cartWidgetRef}
              className="ec-cart-widget"
              aria-label="Shopping cart"
              style={{ minHeight: 1 }}
            />
            <div ref={storeRootRef} id={storeDivId} />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default Store;
