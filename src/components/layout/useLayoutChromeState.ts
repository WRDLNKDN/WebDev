import { useMediaQuery, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';

/** Path + breakpoint flags for layout shell (footer, scroll, chrome). */
export function useLayoutChromeState() {
  const theme = useTheme();
  const { pathname } = useLocation();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  return {
    theme,
    pathname,
    hideFooterForDockedChat: pathname.startsWith('/chat-full') && isMdUp,
    isJoin: pathname.startsWith('/join'),
    isAdmin: pathname.startsWith('/admin'),
    isHome: pathname === '/',
    isFeedRoute: pathname === '/feed',
    isLight: theme.palette.mode === 'light',
  };
}
