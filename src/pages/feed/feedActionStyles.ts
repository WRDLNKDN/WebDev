import { INTERACTION_COLORS } from '../../theme/themeConstants';

export const FEED_ACTION_MUTED_COLOR = 'rgba(255,255,255,0.65)';
export const FEED_ACTION_ACTIVE_COLOR = INTERACTION_COLORS.focus;
export const FEED_ACTION_HOVER_COLOR = INTERACTION_COLORS.focus;
export const FEED_ACTION_SELECTED_TEXT_SX = { fontWeight: 700 } as const;

export const FEED_ACTION_BUTTON_SX = {
  textTransform: 'none',
  minWidth: 0,
  minHeight: { xs: 40, sm: 36 },
  flexDirection: { xs: 'row', sm: 'row' },
  gap: 0.625,
  py: { xs: 0.6, sm: 0.45 },
  px: { xs: 0.85, sm: 0.75 },
  borderRadius: 2,
  boxSizing: 'border-box',
  transition:
    'color 120ms ease, background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
  color: FEED_ACTION_MUTED_COLOR,
  border: '1px solid transparent',
  backgroundColor: 'transparent',
  lineHeight: 1,
  '& .MuiButton-startIcon': {
    margin: 0,
  },
  '& .MuiTouchRipple-root': {
    display: 'none',
  },
  '& .MuiSvgIcon-root, & .MuiTypography-root': {
    color: 'inherit',
  },
  '& .MuiSvgIcon-root': {
    flexShrink: 0,
  },
  '& .MuiTypography-root': {
    fontWeight: 600,
    lineHeight: 1.1,
  },
  '&:focus-visible': {
    outline: 'none',
    borderColor: 'rgba(141,188,229,0.32)',
    boxShadow: '0 0 0 1px rgba(56,132,210,0.14) inset',
  },
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      bgcolor: 'rgba(56,132,210,0.08)',
      borderColor: 'rgba(141,188,229,0.22)',
      color: FEED_ACTION_HOVER_COLOR,
    },
  },
} as const;

export const getActiveActionSx = (active: boolean) => ({
  color: active ? FEED_ACTION_ACTIVE_COLOR : FEED_ACTION_MUTED_COLOR,
  bgcolor: active ? 'rgba(56,132,210,0.12)' : 'transparent',
  borderColor: active ? 'rgba(141,188,229,0.3)' : 'transparent',
  boxShadow: active ? '0 0 0 1px rgba(56,132,210,0.08) inset' : 'none',
  ...(active
    ? {
        '& .MuiTypography-root': FEED_ACTION_SELECTED_TEXT_SX,
      }
    : null),
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      bgcolor: active ? 'rgba(56,132,210,0.16)' : 'rgba(56,132,210,0.08)',
      borderColor: active ? 'rgba(141,188,229,0.34)' : 'rgba(141,188,229,0.22)',
      color: FEED_ACTION_HOVER_COLOR,
    },
  },
});
