import { useEffect, useRef } from 'react';

export function useAuthCallbackFallbackRedirect(next: string): void {
  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    const t = setTimeout(() => {
      const { pathname, search, hash } = window.location;
      const hasOAuthError =
        search?.includes('error') || hash?.includes('error');
      const hasQueryOrHashState =
        search.replace(/^\?/, '').trim().length > 0 ||
        hash.replace(/^#/, '').trim().length > 0;
      const params = new URLSearchParams(search);
      const hasOAuthPayload =
        params.has('code') ||
        params.has('access_token') ||
        params.has('refresh_token') ||
        hash.includes('access_token=') ||
        hash.includes('refresh_token=');
      if (
        pathname === '/auth/callback' &&
        !hasOAuthError &&
        !hasOAuthPayload &&
        !hasQueryOrHashState
      ) {
        const target = nextRef.current || '/feed';
        window.location.replace(target);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, []);
}
