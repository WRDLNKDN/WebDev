import { useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoreExternalUrl } from '../../lib/marketing/storefront';

/**
 * Visiting /store opens the external storefront (Ecwid when configured) in a new tab
 * and sends the user back into the app—no embedded iframe or loading shell.
 */
export const Store = () => {
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const id = window.setTimeout(() => {
      window.open(getStoreExternalUrl(), '_blank', 'noopener,noreferrer');
      navigate('/', { replace: true });
    }, 0);
    return () => window.clearTimeout(id);
  }, [navigate]);

  return null;
};

export default Store;
