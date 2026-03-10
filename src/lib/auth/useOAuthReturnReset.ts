import { useEffect } from 'react';

type ResetOAuthLoadingOptions = {
  loading: boolean;
  reset: () => void;
};

/**
 * Clears OAuth button loading state when the user returns to the page without
 * completing auth, such as using the browser Back button from the IdP.
 */
export function useOAuthReturnReset({
  loading,
  reset,
}: ResetOAuthLoadingOptions) {
  useEffect(() => {
    if (!loading) return;

    const handleReturn = () => {
      if (document.visibilityState !== 'hidden') {
        reset();
      }
    };

    window.addEventListener('pageshow', handleReturn);
    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleReturn);

    return () => {
      window.removeEventListener('pageshow', handleReturn);
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleReturn);
    };
  }, [loading, reset]);
}
