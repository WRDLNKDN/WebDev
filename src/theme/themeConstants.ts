export const BRAND_COLORS = {
  redOrange: '#E13D2D',
  orange: '#EE9932',
  yellow: '#FFFF4C',
  green: '#4DD166',
  blue: '#3884D2',
  purple: '#A744C2',
  white: '#ffffff',
  black: '#000000',
} as const;

export const ACTION_COLORS = {
  primary: BRAND_COLORS.blue,
  primaryHover: '#2D6FAD',
  primaryDisabled: '#9CBBD9',
  secondary: BRAND_COLORS.purple,
  secondaryHover: '#8C39A3',
  secondaryDisabled: '#D3B0DB',
  success: BRAND_COLORS.green,
  successHover: '#40AE55',
  successDisabled: '#A6E2B2',
  warning: BRAND_COLORS.orange,
  warningHover: '#D0852B',
  warningDisabled: '#E6C7A2',
  error: BRAND_COLORS.redOrange,
  errorHover: '#BF3426',
  errorDisabled: '#E09F98',
} as const;

export const SURFACE_COLORS = {
  canvas: '#05070F',
  canvasRaised: '#0B1220',
  paper: '#111827',
  panel: '#182235',
  panelBorder: 'rgba(156, 187, 217, 0.22)',
  panelBorderStrong: 'rgba(156, 187, 217, 0.34)',
} as const;

export const TEXT_COLORS = {
  primary: '#FFFFFF',
  secondary: 'rgba(255,255,255,0.88)',
  muted: 'rgba(255,255,255,0.72)',
  disabled: 'rgba(156,187,217,0.72)',
  link: '#8DBCE5',
  linkHover: BRAND_COLORS.blue,
} as const;

export const INTERACTION_COLORS = {
  muted: TEXT_COLORS.muted,
  react: BRAND_COLORS.green,
  comment: BRAND_COLORS.blue,
  repost: BRAND_COLORS.purple,
  send: BRAND_COLORS.blue,
  save: BRAND_COLORS.yellow,
  care: BRAND_COLORS.orange,
  love: BRAND_COLORS.redOrange,
  focus: '#8DBCE5',
} as const;

export const PALETTE = {
  mode: 'dark' as const,
  primary: {
    main: ACTION_COLORS.primary,
    light: '#8DBCE5',
    dark: ACTION_COLORS.primaryHover,
    contrastText: BRAND_COLORS.black,
  },
  secondary: {
    main: ACTION_COLORS.secondary,
    light: '#CB8FDB',
    dark: ACTION_COLORS.secondaryHover,
    contrastText: BRAND_COLORS.black,
  },
  background: {
    default: SURFACE_COLORS.canvas,
    paper: SURFACE_COLORS.paper,
  },
  text: {
    primary: TEXT_COLORS.primary,
    secondary: TEXT_COLORS.secondary,
    disabled: TEXT_COLORS.disabled,
  },
  error: {
    main: ACTION_COLORS.error,
    dark: ACTION_COLORS.errorHover,
    contrastText: BRAND_COLORS.black,
  },
  warning: {
    main: ACTION_COLORS.warning,
    dark: ACTION_COLORS.warningHover,
    contrastText: BRAND_COLORS.black,
  },
  success: {
    main: ACTION_COLORS.success,
    dark: ACTION_COLORS.successHover,
    contrastText: BRAND_COLORS.black,
  },
  info: {
    main: ACTION_COLORS.primary,
    dark: ACTION_COLORS.primaryHover,
    contrastText: BRAND_COLORS.black,
  },
};

export const FOCUS_RING = {
  outline: `3px solid ${INTERACTION_COLORS.focus}`,
  outlineOffset: '2px',
};

export const FONT_FAMILY =
  '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
