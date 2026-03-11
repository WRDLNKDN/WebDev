export const BRAND_COLORS = {
  lightBlue: '#56B4E9',
  red: '#D55E00',
  violet: '#CC79A7',
  green: '#009E73',
  yellow: '#F0E442',
  orange: '#E69F00',
  blue: '#0072B2',
  white: '#ffffff',
} as const;

export const INTERACTION_COLORS = {
  muted: 'rgba(255,255,255,0.65)',
  react: BRAND_COLORS.green,
  comment: BRAND_COLORS.blue,
  repost: BRAND_COLORS.violet,
  send: BRAND_COLORS.lightBlue,
  save: BRAND_COLORS.yellow,
  care: BRAND_COLORS.orange,
  love: BRAND_COLORS.red,
  focus: BRAND_COLORS.lightBlue,
} as const;

export const PALETTE = {
  mode: 'dark' as const,
  primary: {
    main: BRAND_COLORS.blue,
    light: '#56B4E9',
    dark: '#00507D',
    contrastText: '#000000',
  },
  secondary: {
    main: BRAND_COLORS.violet,
    light: '#DEA9C6',
    dark: '#9C4F7E',
    contrastText: '#000000',
  },
  background: {
    default: '#121212',
    paper: '#1e1e1e',
  },
  text: {
    primary: '#ffffff',
    secondary: '#e8e8e8',
    disabled: '#9e9e9e',
  },
  error: {
    main: BRAND_COLORS.red,
    dark: '#9B4300',
    contrastText: '#000000',
  },
  warning: {
    main: BRAND_COLORS.orange,
    dark: '#A66E00',
    contrastText: '#000000',
  },
  success: {
    main: BRAND_COLORS.green,
    dark: '#006F52',
    contrastText: '#000000',
  },
  info: {
    main: BRAND_COLORS.lightBlue,
    dark: '#2A89BC',
    contrastText: '#000000',
  },
};

export const FOCUS_RING = {
  outline: `3px solid ${INTERACTION_COLORS.focus}`,
  outlineOffset: '2px',
};

export const FONT_FAMILY =
  '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
