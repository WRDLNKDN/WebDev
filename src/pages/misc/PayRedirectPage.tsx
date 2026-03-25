import { useLayoutEffect } from 'react';

import { GODADDY_PAY_LINK } from '../../lib/marketing/payLink';

/**
 * Client-side fallback when Vercel `/pay` redirect is not in effect (e.g. local Vite).
 * Production: edge 302 handles `/pay` before the SPA loads.
 */
export const PayRedirectPage = () => {
  useLayoutEffect(() => {
    window.location.replace(GODADDY_PAY_LINK);
  }, []);
  return null;
};
