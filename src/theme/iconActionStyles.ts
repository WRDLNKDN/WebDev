import type { SxProps, Theme } from '@mui/material/styles';

export const glassDangerIconButtonSx: SxProps<Theme> = {
  color: '#f5f9ff',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '18px',
  background:
    'linear-gradient(180deg, rgba(118,137,190,0.18) 0%, rgba(92,109,163,0.16) 100%)',
  border: '1px solid rgba(173,203,255,0.24)',
  boxShadow:
    '0 14px 28px rgba(4,10,25,0.42), inset 0 1px 0 rgba(156,187,217,0.26), 0 0 0 1px rgba(56,132,210,0.10)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 1,
    borderRadius: '16px',
    background:
      'radial-gradient(circle at 28% 24%, rgba(141,188,229,0.34), rgba(56,132,210,0.08) 45%, rgba(132,154,214,0.08) 100%)',
    pointerEvents: 'none',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    right: '-10%',
    bottom: '-12%',
    width: '62%',
    height: '62%',
    background:
      'radial-gradient(circle, rgba(96,208,255,0.7) 0%, rgba(96,208,255,0.28) 38%, rgba(96,208,255,0) 74%)',
    pointerEvents: 'none',
    opacity: 0.9,
  },
  '& .MuiSvgIcon-root': {
    position: 'relative',
    zIndex: 1,
  },
  '&:hover': {
    color: '#FFFFFF',
    background:
      'linear-gradient(180deg, rgba(128,149,206,0.22) 0%, rgba(98,118,177,0.2) 100%)',
    borderColor: 'rgba(191,219,254,0.44)',
    boxShadow:
      '0 18px 34px rgba(4,10,25,0.46), inset 0 1px 0 rgba(156,187,217,0.32), 0 0 18px rgba(96,208,255,0.18)',
  },
};

export const compactGlassDangerIconButtonSx: SxProps<Theme> = {
  ...glassDangerIconButtonSx,
  width: 40,
  height: 40,
  minWidth: 40,
  padding: 0,
  '& .MuiSvgIcon-root': {
    position: 'relative',
    zIndex: 1,
    fontSize: '1.45rem',
  },
};

export const tinyGlassDangerIconButtonSx: SxProps<Theme> = {
  ...glassDangerIconButtonSx,
  width: 28,
  height: 28,
  minWidth: 28,
  padding: 0,
  borderRadius: '14px',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 1,
    borderRadius: '12px',
    background:
      'radial-gradient(circle at 28% 24%, rgba(141,188,229,0.34), rgba(56,132,210,0.08) 45%, rgba(132,154,214,0.08) 100%)',
    pointerEvents: 'none',
  },
  '& .MuiSvgIcon-root': {
    position: 'relative',
    zIndex: 1,
    fontSize: '1rem',
  },
};
