import { Box, Typography } from '@mui/material';
import { useEffect } from 'react';
import {
  buildEcwidEmbedScriptSrc,
  getEcwidEmbedStoreId,
  getEcwidScriptId,
  getEcwidStoreDivId,
} from '../../lib/marketing/storefront';

/**
 * In-app Ecwid storefront at `/store` (full-width embed; no external redirect).
 * Script and `xProductBrowser` args match Ecwid “code” platform embed for this shop.
 */
export const Store = () => {
  const storeId = getEcwidEmbedStoreId();
  const storeDivId = getEcwidStoreDivId(storeId);
  const scriptId = getEcwidScriptId(storeId);

  useEffect(() => {
    const runProductBrowser = () => {
      const fn = window.xProductBrowser;
      if (typeof fn !== 'function') return;
      fn(
        'categoriesPerRow=3',
        'views=grid(20,3) list(60) table(60)',
        'categoryView=grid',
        'searchView=list',
        `id=${storeDivId}`,
      );
    };

    const existing = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;
    if (existing) {
      runProductBrowser();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'text/javascript';
    script.async = true;
    script.charset = 'utf-8';
    script.setAttribute('data-cfasync', 'false');
    script.src = buildEcwidEmbedScriptSrc(storeId);
    script.onload = () => {
      runProductBrowser();
    };
    document.body.appendChild(script);
  }, [scriptId, storeDivId, storeId]);

  return (
    <Box
      component="main"
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        px: { xs: 1, sm: 1.5, md: 2 },
        py: { xs: 1.5, md: 2 },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
      }}
    >
      <Typography
        component="h1"
        variant="h5"
        sx={{
          fontWeight: 800,
          color: 'text.primary',
          mb: 1.5,
          flexShrink: 0,
        }}
      >
        Store
      </Typography>
      <Box
        id={storeDivId}
        sx={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          flex: '1 1 auto',
          minHeight: { xs: '50vh', md: '60vh' },
          '& .ecwid, & .ec-size, & iframe': {
            maxWidth: '100% !important',
          },
        }}
      />
    </Box>
  );
};

export default Store;
