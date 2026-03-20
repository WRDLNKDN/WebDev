// src/theme/candyStyles.ts
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// --- BACKGROUND ASSETS (The Substrate) ---
// Responsive: mobile on xs/sm, desktop on md+
// Subtle smaller grid overlay for depth (drawn over the background image)
const SUBTLE_GRID = {
  position: 'relative' as const,
  '&::before': {
    content: '""',
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(56,132,210,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,132,210,0.06) 1px, transparent 1px)
    `,
    backgroundSize: '24px 24px',
    pointerEvents: 'none' as const,
    zIndex: 0,
  },
};

export const PAGE_BACKGROUND = {
  backgroundImage: {
    xs: 'url("/assets/background-mobile.png")',
    md: 'url("/assets/background-desktop.png")',
  },
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  ...SUBTLE_GRID,
} as const;

// Theme-aware glass styles
export const getAppGlassBorder = (theme: Theme) =>
  `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.26 : 0.26)}`;

export const getAppGlassSurface = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  return alpha(theme.palette.background.paper, isLight ? 0.95 : 0.76);
};

export const getAppGlassSurfaceStrong = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  return alpha(theme.palette.background.paper, isLight ? 0.98 : 0.86);
};

export const getAppGlassShadow = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  return isLight
    ? '0 18px 60px rgba(0,0,0,0.12)'
    : '0 18px 60px rgba(0,0,0,0.55)';
};

export const APP_GLASS_BACKDROP = 'blur(12px)';

export const getAppPageOverlay = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  const color = isLight ? theme.palette.background.default : '#05070F';
  return `linear-gradient(180deg, ${alpha(color, 0.78)} 0%, ${alpha(color, 0.92)} 100%)`;
};

// Legacy constants for backward compatibility (dark theme only)
export const APP_GLASS_BORDER = '1px solid rgba(156,187,217,0.26)';
export const APP_GLASS_SURFACE = 'rgba(17,24,39,0.76)';
export const APP_GLASS_SURFACE_STRONG = 'rgba(17,24,39,0.86)';
export const APP_GLASS_SHADOW = '0 18px 60px rgba(0,0,0,0.55)';
export const APP_PAGE_OVERLAY =
  'linear-gradient(180deg, rgba(5,7,15,0.78) 0%, rgba(5,7,15,0.92) 100%)';

export const getNavbarGlass = (theme: Theme) => ({
  bgcolor: getAppGlassSurface(theme),
  backgroundColor: getAppGlassSurface(theme),
  backgroundImage: 'none',
  color: theme.palette.text.primary,
  backdropFilter: APP_GLASS_BACKDROP,
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.18)}`,
});

// Legacy constant for backward compatibility
export const NAVBAR_GLASS = {
  bgcolor: APP_GLASS_SURFACE,
  backgroundColor: APP_GLASS_SURFACE,
  backgroundImage: 'none',
  color: '#FFFFFF',
  backdropFilter: APP_GLASS_BACKDROP,
  borderBottom: '1px solid rgba(156,187,217,0.18)',
} as const;

/** @deprecated Use PAGE_BACKGROUND. Kept for legacy SYNERGY_BG usage. */
export const SYNERGY_BG = 'url("/assets/background-desktop.png")';
export const PROFILE_BG = 'url("/assets/profile-bg.png")';

// Theme-aware card backgrounds
export const getCardBg = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  return alpha(theme.palette.background.paper, isLight ? 1 : 0.78);
};

export const getSearchBg = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  return alpha(theme.palette.background.default, isLight ? 0.6 : 0.4);
};

export const getEmptyStateBg = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  return alpha(theme.palette.background.paper, isLight ? 1 : 0.84);
};

export const getHeroCardBg = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  return alpha(theme.palette.background.paper, isLight ? 1 : 0.88);
};

export const getGridCardBg = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  return alpha(theme.palette.primary.main, isLight ? 0.08 : 0.12);
};

export const getMissionSectionBg = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  return alpha(theme.palette.background.default, isLight ? 0.95 : 0.92);
};

// Legacy constants for backward compatibility (dark theme only)
export const CARD_BG = 'rgba(17,24,39,0.78)';
export const SEARCH_BG = 'rgba(0, 0, 0, 0.4)';
export const EMPTY_STATE_BG = 'rgba(17,24,39,0.84)';
export const HERO_CARD_BG = 'rgba(17,24,39,0.88)';
export const GRID_CARD_BG = 'rgba(56,132,210,0.12)';
export const MISSION_SECTION_BG = 'rgba(5,7,15,0.92)';

// --- THE CANDY UI SYSTEM ---

// 1. HAZARD RED (Action/Empty States)
export const CANDY_HAZARD = {
  background: 'rgba(78,21,18,0.32)',
  backdropFilter: 'blur(4px)',
  border: '2px dashed #E13D2D',
  color: '#F39188',
  boxShadow: '0 0 15px rgba(225, 61, 45, 0.08)',
  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'scale(1.02) translateY(-4px)',
    borderStyle: 'solid',
    borderColor: '#F39188',
    background: 'linear-gradient(160deg, #E13D2D 0%, #BF3426 100%)',
    color: '#FFFFFF',
    boxShadow:
      '0 0 40px rgba(225, 61, 45, 0.45), inset 2px 2px 6px rgba(255,255,255,0.3)',
  },
};

// 2. SUCCESS GREEN (Verified States — sleeker)
export const CANDY_SUCCESS = {
  background: 'rgba(31, 74, 40, 0.28)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(77,209,102,0.42)',
  color: '#4DD166',
  boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
  transition: 'all 0.25s ease',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    borderColor: 'rgba(77,209,102,0.62)',
    boxShadow: '0 4px 20px rgba(77,209,102,0.16)',
  },
};

// 3. BLUEY (Content/Profile Cards — sleeker)
export const CANDY_BLUEY = {
  background: 'rgba(17,24,39,0.5)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(56,132,210,0.38)',
  color: '#3884D2',
  boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
  transition: 'all 0.25s ease',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    borderColor: 'rgba(141,188,229,0.58)',
    boxShadow: '0 4px 20px rgba(56,132,210,0.18)',
  },
};

// 4. Glass card (theme-aware — profile/dashboard sections, chat popout)
export const getGlassCard = (theme: Theme) => ({
  position: 'relative' as const,
  width: '100%',
  borderRadius: 3,
  border: getAppGlassBorder(theme),
  bgcolor: getAppGlassSurface(theme),
  backdropFilter: APP_GLASS_BACKDROP,
  boxShadow: getAppGlassShadow(theme),
  color: theme.palette.text.primary,
  overflow: 'hidden' as const,
});

// Legacy constant for backward compatibility (dark theme only)
export const GLASS_CARD = {
  position: 'relative' as const,
  width: '100%',
  borderRadius: 3,
  border: APP_GLASS_BORDER,
  bgcolor: APP_GLASS_SURFACE,
  backdropFilter: APP_GLASS_BACKDROP,
  boxShadow: APP_GLASS_SHADOW,
  color: '#FFFFFF',
  overflow: 'hidden' as const,
};

// 5. Dashed add card (theme-aware — Portfolio "Add Project" / "Add Resume")
export const getDashedCardNeutral = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  const borderColor = isLight
    ? alpha(theme.palette.primary.main, 0.3)
    : 'rgba(141,188,229,0.42)';
  const bgColor = isLight
    ? alpha(theme.palette.background.paper, 0.9)
    : 'rgba(17,24,39,0.72)';
  const hoverBgColor = isLight
    ? alpha(theme.palette.background.paper, 1)
    : 'rgba(24,34,53,0.84)';
  return {
    background: bgColor,
    backdropFilter: 'blur(8px)',
    border: `2px dashed ${borderColor}`,
    color: theme.palette.text.primary,
    boxShadow: isLight
      ? '0 0 20px rgba(0,0,0,0.08)'
      : '0 0 20px rgba(0,0,0,0.3)',
    transition: 'all 0.25s ease',
    cursor: 'pointer' as const,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      borderColor: isLight
        ? alpha(theme.palette.primary.main, 0.5)
        : 'rgba(141,188,229,0.62)',
      background: hoverBgColor,
      boxShadow: isLight
        ? '0 0 24px rgba(0,0,0,0.12)'
        : '0 0 24px rgba(56,132,210,0.18)',
    },
  };
};

// Legacy constant for backward compatibility (dark theme only)
export const DASHED_CARD_NEUTRAL = {
  background: 'rgba(17,24,39,0.72)',
  backdropFilter: 'blur(8px)',
  border: '2px dashed rgba(141,188,229,0.42)',
  color: '#FFFFFF',
  boxShadow: '0 0 20px rgba(0,0,0,0.3)',
  transition: 'all 0.25s ease',
  cursor: 'pointer' as const,
  display: 'flex' as const,
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    borderColor: 'rgba(141,188,229,0.62)',
    background: 'rgba(24,34,53,0.84)',
    boxShadow: '0 0 24px rgba(56,132,210,0.18)',
  },
};

export const SIGNUP_BG = {
  position: 'relative',
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  px: 2,
  py: 6,
  backgroundImage: {
    xs: 'url("/assets/background-mobile.png")',
    md: 'url("/assets/background-desktop.png")',
  },
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: { xs: 'scroll', md: 'fixed' },
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 50% 30%, rgba(0,0,0,0.2), rgba(0,0,0,0.9))',
    zIndex: 0,
  },
};

export const AUTH_SCREEN_BG = {
  ...SIGNUP_BG,
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: APP_PAGE_OVERLAY,
    zIndex: 0,
    pointerEvents: 'none' as const,
  },
} as const;
