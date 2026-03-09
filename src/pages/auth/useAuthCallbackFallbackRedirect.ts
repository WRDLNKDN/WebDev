import { useEffect, useRef } from 'react';

export function useAuthCallbackFallbackRedirect(next: string): void {
  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    const t = setTimeout(() => {
      const { pathname, search, hash } = window.location;
      const hasOAuthError =
        search?.includes('error') || hash?.includes('error');
      if (pathname === '/auth/callback' && !hasOAuthError) {
        const target = nextRef.current || '/feed';
        window.location.replace(target);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, []);
}
