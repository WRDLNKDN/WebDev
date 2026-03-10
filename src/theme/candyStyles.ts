// src/theme/candyStyles.ts

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
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
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

export const APP_GLASS_BORDER = '1px solid rgba(255,255,255,0.12)';
export const APP_GLASS_SURFACE = 'rgba(16, 18, 24, 0.72)';
export const APP_GLASS_SURFACE_STRONG = 'rgba(16, 18, 24, 0.82)';
export const APP_GLASS_SHADOW = '0 18px 60px rgba(0,0,0,0.55)';
export const APP_GLASS_BACKDROP = 'blur(12px)';
export const APP_PAGE_OVERLAY =
  'linear-gradient(180deg, rgba(8,8,10,0.78) 0%, rgba(8,8,10,0.9) 100%)';

export const NAVBAR_GLASS = {
  bgcolor: APP_GLASS_SURFACE,
  backgroundColor: APP_GLASS_SURFACE,
  backgroundImage: 'none',
  color: '#ffffff',
  backdropFilter: APP_GLASS_BACKDROP,
  borderBottom: '1px solid rgba(255,255,255,0.08)',
} as const;

/** @deprecated Use PAGE_BACKGROUND. Kept for legacy SYNERGY_BG usage. */
export const SYNERGY_BG = 'url("/assets/background-desktop.png")';
export const PROFILE_BG = 'url("/assets/profile-bg.png")';
export const CARD_BG = 'rgba(30, 30, 30, 0.65)';
export const SEARCH_BG = 'rgba(0, 0, 0, 0.4)';
export const EMPTY_STATE_BG = 'rgba(18, 18, 18, 0.8)';
export const HERO_CARD_BG = 'rgba(30, 30, 30, 0.85)';
export const GRID_CARD_BG = 'rgba(255, 255, 255, 0.05)';
export const MISSION_SECTION_BG = 'rgba(0, 0, 0, 0.9)';

// --- THE CANDY UI SYSTEM ---

// 1. HAZARD RED (Action/Empty States)
export const CANDY_HAZARD = {
  background: 'rgba(20, 0, 0, 0.3)',
  backdropFilter: 'blur(4px)',
  border: '2px dashed #ff4d4d',
  color: '#ff4d4d',
  boxShadow: '0 0 15px rgba(255, 0, 0, 0.05)',
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
    borderColor: '#ff9999',
    background: 'linear-gradient(160deg, #ff4d4d 0%, #b30000 100%)',
    color: 'white',
    boxShadow: `0 0 40px rgba(255, 0, 0, 0.6), inset 2px 2px 6px rgba(255,255,255,0.4)`,
  },
};

// 2. SUCCESS GREEN (Verified States — sleeker)
export const CANDY_SUCCESS = {
  background: 'rgba(0, 24, 0, 0.25)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(0, 230, 118, 0.4)',
  color: '#00e676',
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
    borderColor: 'rgba(0, 230, 118, 0.6)',
    boxShadow: '0 4px 20px rgba(0, 230, 118, 0.12)',
  },
};

// 3. BLUEY (Content/Profile Cards — sleeker)
export const CANDY_BLUEY = {
  background: 'rgba(0, 20, 40, 0.35)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(66, 165, 245, 0.35)',
  color: '#42a5f5',
  boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
  transition: 'all 0.25s ease',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    borderColor: 'rgba(66, 165, 245, 0.55)',
    boxShadow: '0 4px 20px rgba(66, 165, 245, 0.15)',
  },
};

// 4. Glass card (dark, subtle blue glow — profile/dashboard sections, chat popout)
export const GLASS_CARD = {
  position: 'relative' as const,
  width: '100%',
  borderRadius: 3,
  border: APP_GLASS_BORDER,
  bgcolor: APP_GLASS_SURFACE,
  backdropFilter: APP_GLASS_BACKDROP,
  boxShadow: APP_GLASS_SHADOW,
  color: '#fff',
  overflow: 'hidden' as const,
};

// 5. Dashed add card (neutral — Portfolio "Add Project" / "Add Resume")
export const DASHED_CARD_NEUTRAL = {
  background: 'rgba(30, 30, 30, 0.6)',
  backdropFilter: 'blur(8px)',
  border: '2px dashed rgba(255,255,255,0.25)',
  color: '#fff',
  boxShadow: '0 0 20px rgba(0,0,0,0.3)',
  transition: 'all 0.25s ease',
  cursor: 'pointer' as const,
  display: 'flex' as const,
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.45)',
    background: 'rgba(40, 40, 40, 0.7)',
    boxShadow: '0 0 24px rgba(66, 165, 245, 0.12)',
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
