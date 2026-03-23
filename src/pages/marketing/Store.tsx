import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GODADDY_STOREFRONT_URL,
  resolveStoreExternalUrl,
} from '../../lib/marketing/storefront';

/**
 * Visiting /store resolves the same URL as the navbar Store link (GoDaddy when live, else Ecwid),
 * opens it in a new tab, and returns you to home in this tab.
 */
export const Store = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = await resolveStoreExternalUrl();
        if (!cancelled) {
          window.open(url, '_blank', 'noopener,noreferrer');
          navigate('/', { replace: true });
        }
      } catch {
        if (!cancelled) {
          window.open(GODADDY_STOREFRONT_URL, '_blank', 'noopener,noreferrer');
          navigate('/', { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return null;
};

export default Store;
