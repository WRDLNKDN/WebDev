// src/theme/candyStyles.ts

// --- BACKGROUND ASSETS (The Substrate) ---
export const SYNERGY_BG = 'url("/assets/background.png")';
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

// 2. SUCCESS GREEN (Verified States)
export const CANDY_SUCCESS = {
  background: 'rgba(0, 20, 0, 0.3)',
  backdropFilter: 'blur(4px)',
  border: '2px dashed #00e676',
  color: '#00e676',
  boxShadow: '0 0 15px rgba(0, 255, 0, 0.05)',
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
    borderColor: '#69f0ae',
    background: 'linear-gradient(160deg, #00e676 0%, #00a152 100%)',
    color: 'white',
    boxShadow: `0 0 40px rgba(0, 255, 100, 0.6), inset 2px 2px 6px rgba(255,255,255,0.4)`,
  },
};

// 3. BLUEY (Content/Profile Cards)
export const CANDY_BLUEY = {
  background: 'rgba(0, 20, 40, 0.4)',
  backdropFilter: 'blur(4px)',
  border: '2px solid rgba(66, 165, 245, 0.5)',
  color: '#42a5f5',
  boxShadow: '0 0 15px rgba(33, 150, 243, 0.1)',
  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'scale(1.02) translateY(-4px)',
    borderColor: '#90caf9',
    background: 'linear-gradient(160deg, #42a5f5 0%, #1565c0 100%)',
    color: 'white',
    boxShadow: `0 0 40px rgba(33, 150, 243, 0.6), inset 2px 2px 6px rgba(255,255,255,0.4)`,
  },
};

// 4. Glass card (dark, subtle blue glow — profile/dashboard sections)
export const GLASS_CARD = {
  position: 'relative' as const,
  width: '100%',
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.12)',
  bgcolor: 'rgba(16, 18, 24, 0.70)',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 0 30px rgba(66, 165, 245, 0.08), 0 18px 60px rgba(0,0,0,0.55)',
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
  backgroundImage: 'url(/assets/background.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 50% 30%, rgba(0,0,0,0.2), rgba(0,0,0,0.9))',
    zIndex: 0,
  },
};
