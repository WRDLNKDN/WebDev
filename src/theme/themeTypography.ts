import { FONT_FAMILY } from './themeConstants';

export const THEME_TYPOGRAPHY = {
  fontFamily: FONT_FAMILY,
  fontSize: 16,
  htmlFontSize: 16,
  h1: {
    fontFamily: FONT_FAMILY,
    fontWeight: 700,
    lineHeight: 1.1,
    fontSize: 'clamp(2rem, 5vw + 1rem, 4.5rem)',
  },
  h2: {
    fontFamily: FONT_FAMILY,
    fontWeight: 600,
    lineHeight: 1.2,
    fontSize: 'clamp(1.5rem, 4vw + 1rem, 3rem)',
  },
  h3: {
    fontFamily: FONT_FAMILY,
    fontWeight: 600,
    lineHeight: 1.3,
    fontSize: 'clamp(1.25rem, 3vw + 1rem, 2.25rem)',
  },
  h4: {
    fontFamily: FONT_FAMILY,
    fontWeight: 500,
    lineHeight: 1.4,
    fontSize: 'clamp(1.125rem, 2vw + 1rem, 1.75rem)',
  },
  h5: {
    fontFamily: FONT_FAMILY,
    fontWeight: 500,
    lineHeight: 1.4,
    fontSize: 'clamp(1.1rem, 1.5vw + 1rem, 1.5rem)',
  },
  h6: {
    fontFamily: FONT_FAMILY,
    fontWeight: 500,
    lineHeight: 1.5,
    fontSize: 'clamp(1rem, 1vw + 1rem, 1.25rem)',
  },
  subtitle1: { fontFamily: FONT_FAMILY, fontWeight: 500 },
  subtitle2: { fontFamily: FONT_FAMILY, fontWeight: 500 },
  button: {
    fontFamily: FONT_FAMILY,
    fontWeight: 600,
    textTransform: 'none',
  },
  body1: {
    fontFamily: FONT_FAMILY,
    fontSize: 'clamp(1rem, 0.5vw + 1rem, 1.125rem)',
    lineHeight: 1.6,
  },
  body2: {
    fontFamily: FONT_FAMILY,
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  caption: {
    fontFamily: FONT_FAMILY,
    fontSize: '0.75rem',
    lineHeight: 1.5,
  },
  overline: {
    fontFamily: FONT_FAMILY,
  },
};
