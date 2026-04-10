import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Wordmark container styles: non-interactive on home, link hover elsewhere.
 */
export function navbarLogoWrapSx(
  isHome: boolean,
  isMobile: boolean,
): SxProps<Theme> {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    height: { xs: 36, sm: 40 },
    flexShrink: isMobile ? 1 : 0,
    minWidth: 0,
    borderRadius: 1,
    py: 0.5,
    px: 0.5,
    bgcolor: 'rgba(0,0,0,0.35)',
    transition: 'opacity 0.2s, background-color 0.2s',
    overflow: 'hidden',
    ...(isHome
      ? { cursor: 'default' }
      : {
          '&:hover': {
            opacity: 0.9,
            bgcolor: 'rgba(0,0,0,0.5)',
          },
        }),
  };
}
