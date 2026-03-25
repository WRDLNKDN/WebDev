import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

/** Shared mobile-drawer chrome: same Paper + link colors as `Navbar` toolbar drawer. */
export function getNavbarDrawerChrome(theme: Theme): {
  drawerPaperSx: SxProps<Theme>;
  drawerLinkColor: string;
  drawerActiveNavSx: SxProps<Theme>;
} {
  const isLightNav = theme.palette.mode === 'light';
  return {
    drawerPaperSx: {
      width: 280,
      bgcolor: isLightNav
        ? theme.palette.background.paper
        : 'rgba(18, 18, 18, 0.98)',
      borderRight: isLightNav
        ? `1px solid ${theme.palette.divider}`
        : '1px solid rgba(156,187,217,0.18)',
    },
    drawerLinkColor: isLightNav ? 'text.primary' : 'white',
    drawerActiveNavSx: isLightNav
      ? {
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.18) },
        }
      : {
          bgcolor: 'rgba(156,187,217,0.26)',
          '&:hover': { bgcolor: 'rgba(141,188,229,0.34)' },
        },
  };
}
