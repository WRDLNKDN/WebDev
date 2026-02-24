import { useEffect, useState } from 'react';

export const UAT_BANNER_ELEMENT_ID = 'uat-environment-banner';

const getBannerHeight = (): number => {
  if (typeof document === 'undefined') return 0;
  const banner = document.getElementById(UAT_BANNER_ELEMENT_ID);
  if (!banner) return 0;
  return Math.ceil(banner.getBoundingClientRect().height);
};

/**
 * Returns the current rendered UAT banner height in pixels.
 * Falls back to 0 when the banner is not present.
 */
export const useUatBannerOffset = (): number => {
  const [offsetPx, setOffsetPx] = useState(0);

  useEffect(() => {
    const updateOffset = () => {
      setOffsetPx(getBannerHeight());
    };

    updateOffset();
    const rafId = window.requestAnimationFrame(updateOffset);
    const timeoutId = window.setTimeout(updateOffset, 250);
    window.addEventListener('resize', updateOffset);

    const banner = document.getElementById(UAT_BANNER_ELEMENT_ID);
    let observer: ResizeObserver | null = null;
    if (banner && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => {
        updateOffset();
      });
      observer.observe(banner);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', updateOffset);
      observer?.disconnect();
    };
  }, []);

  return offsetPx;
};
