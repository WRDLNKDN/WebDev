import { forwardRef } from 'react';
import { Link, type LinkProps, useHref } from 'react-router-dom';
import { prefetchChunksForPath } from '../../lib/routing/routePrefetch';

/**
 * Same as react-router {@link Link}, plus chunk prefetch on hover/focus/touch
 * (pairs with `prefetchChunksForPath` for Vite lazy routes).
 */
export const RouterLinkPrefetch = forwardRef<HTMLAnchorElement, LinkProps>(
  function RouterLinkPrefetch(
    { to, onMouseEnter, onFocus, onTouchStart, ...rest },
    ref,
  ) {
    const href = useHref(to);
    const pathname = href.split('?')[0]?.split('#')[0] ?? '/';

    const warm = () => {
      prefetchChunksForPath(pathname);
    };

    return (
      <Link
        ref={ref}
        to={to}
        {...rest}
        onMouseEnter={(e) => {
          warm();
          onMouseEnter?.(e);
        }}
        onFocus={(e) => {
          warm();
          onFocus?.(e);
        }}
        onTouchStart={(e) => {
          warm();
          onTouchStart?.(e);
        }}
      />
    );
  },
);
