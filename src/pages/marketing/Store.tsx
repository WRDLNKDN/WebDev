import {
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
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
  const [activeStorefront, setActiveStorefront] = useState<'ecwid' | 'backup'>(
    () => (storeId ? 'ecwid' : 'backup'),
  );
  const [embedStatus, setEmbedStatus] = useState<'idle' | 'loading' | 'ready'>(
    () => (storeId ? 'loading' : 'idle'),
  );

  useEffect(() => {
    if (activeStorefront !== 'ecwid' || !storeId || !storeDivId) {
      return;
    }

    const storeRoot = storeRootRef.current;
    const cartWidget = cartWidgetRef.current;
    if (!storeRoot || !cartWidget) return;

    setEmbedStatus('loading');

    window.ecwid_script_defer = true;
    window.ecwid_dynamic_widgets = true;

    destroyEcwidWidgets();
    storeRoot.replaceChildren();
    cartWidget.replaceChildren();

    window._xnext_initialization_scripts =
      buildEcwidProductBrowserInit(storeDivId);

    const markReady = () => {
      setEmbedStatus('ready');
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
    const switchToBackup = () => {
      setActiveStorefront('backup');
    };

    const renderTimeout = window.setTimeout(() => {
      if (!hasRenderedStore()) {
        switchToBackup();
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
      console.warn(
        '[Store] Failed to load Ecwid script. Check VITE_ECWID_STORE_ID and network.',
      );
      switchToBackup();
    };

    document.body.appendChild(script);

    return () => {
      observer.disconnect();
      window.clearTimeout(renderTimeout);
      destroyEcwidWidgets();
    };
  }, [activeStorefront, storeId, storeDivId]);

  return (
    <Box
      component="main"
      sx={{ minHeight: '80vh', bgcolor: 'background.default' }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Store
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {storeId
                ? 'Shop inside WRDLNKDN. Cart and checkout stay powered by Ecwid when the embed is available; otherwise the GoDaddy storefront loads here automatically.'
                : 'Browse the WRDLNKDN storefront. Set VITE_ECWID_STORE_ID to prefer the embedded Ecwid experience when you are ready.'}
            </Typography>
          </Box>

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
            {activeStorefront === 'backup' ? (
              <Box
                component="iframe"
                src={GODADDY_STOREFRONT_URL}
                title="WRDLNKDN storefront"
                sx={{
                  display: 'block',
                  width: '100%',
                  minHeight: 600,
                  height: { xs: '70vh', md: '75vh' },
                  maxHeight: 1200,
                  border: 'none',
                }}
              />
            ) : (
              <>
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
              </>
            )}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default Store;
