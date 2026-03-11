import { alpha, createTheme } from '@mui/material/styles';
import { FONT_FAMILY, FOCUS_RING, PALETTE } from './themeConstants';

const theme = createTheme({
  palette: PALETTE,

  // TYPOGRAPHY: local/system sans stack to keep the landing path fast.
  typography: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    htmlFontSize: 16,

    // H1: Hero Titles (Mobile: 32px -> Desktop: 72px)
    h1: {
      fontFamily: FONT_FAMILY,
      fontWeight: 700,
      lineHeight: 1.1,
      fontSize: 'clamp(2rem, 5vw + 1rem, 4.5rem)',
    },

    // H2: Section Headers (Mobile: 24px -> Desktop: 48px)
    h2: {
      fontFamily: FONT_FAMILY,
      fontWeight: 600,
      lineHeight: 1.2,
      fontSize: 'clamp(1.5rem, 4vw + 1rem, 3rem)',
    },

    // H3: Card Titles (Mobile: 20px -> Desktop: 36px)
    h3: {
      fontFamily: FONT_FAMILY,
      fontWeight: 600,
      lineHeight: 1.3,
      fontSize: 'clamp(1.25rem, 3vw + 1rem, 2.25rem)',
    },

    // H4: Subtitles (Mobile: 18px -> Desktop: 28px)
    h4: {
      fontFamily: FONT_FAMILY,
      fontWeight: 500,
      lineHeight: 1.4,
      fontSize: 'clamp(1.125rem, 2vw + 1rem, 1.75rem)',
    },

    // H5: Dense Headers
    h5: {
      fontFamily: FONT_FAMILY,
      fontWeight: 500,
      lineHeight: 1.4,
      fontSize: 'clamp(1.1rem, 1.5vw + 1rem, 1.5rem)',
    },

    // H6: Micro Headers
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

    // Body text scales slightly for better reading on large monitors
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
  },

  // COMPONENT OVERRIDES: The Compliance Engine
  components: {
    // 1. GLOBAL RESET — single scrollbar: html/body do not scroll; #root is the scroll container (Join overrides on its page)
    MuiCssBaseline: {
      styleOverrides: {
        '@global': {
          html: {
            overflow: 'hidden',
            height: '100%',
            fontFamily: FONT_FAMILY,
          },
          body: {
            overflowX: 'hidden',
            overflowY: 'hidden',
            height: '100%',
            fontFamily: FONT_FAMILY,
          },
          // #root does not scroll; Layout and Join use their own scroll container
          '#root': {
            height: '100%',
            overflow: 'hidden',
          },
          // Single scroll container (Layout and Join use this class for scrollbar styling)
          '.app-scroll-container': {
            scrollbarColor: '#6b6b6b #2b2b2b',
            '&::-webkit-scrollbar': {
              backgroundColor: '#2b2b2b',
            },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: '#6b6b6b',
              minHeight: 24,
              border: '3px solid #2b2b2b',
            },
            '&::-webkit-scrollbar-thumb:focus': {
              backgroundColor: '#959595',
            },
          },
          'input, textarea, button, select, option, optgroup': {
            fontFamily: FONT_FAMILY,
          },
          // Global link affordance: every real anchor gets obvious hover text feedback.
          'a[href]': {
            transition:
              'color 120ms ease, text-decoration-color 120ms ease, opacity 120ms ease',
          },
          'a[href]:hover': {
            textDecoration: 'underline !important',
            textUnderlineOffset: '3px',
            textDecorationThickness: '2px',
            cursor: 'pointer',
          },
          'a[href]:focus-visible': {
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          },
        },
      },
    },

    // 2. INTERACTIVE ELEMENTS (Touch Targets & Focus)
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false, // Ripple is good feedback (WCAG 2.2)
      },
      styleOverrides: {
        root: {
          '&:focus-visible': FOCUS_RING,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 44, // WCAG 2.5.5 (Target Size)
          padding: '8px 24px',
          fontWeight: 700,
          transition:
            'color 120ms ease, background-color 120ms ease, transform 120ms ease, box-shadow 120ms ease, text-decoration-color 120ms ease',
          '&:focus-visible': FOCUS_RING,
          '&:hover': {
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            boxShadow: 'inset 0 -2px 0 currentColor',
            transform: 'translateY(-1px)',
          },
          '&[aria-pressed="true"], &[aria-selected="true"]': {
            fontWeight: 800,
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            boxShadow: 'inset 0 -2px 0 currentColor',
          },
        },
        containedPrimary: {
          '&:hover': { backgroundColor: PALETTE.primary.dark },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': FOCUS_RING,
          // Ensure visual bounds match touch target
          padding: 12,
          transition:
            'color 120ms ease, background-color 120ms ease, transform 120ms ease, box-shadow 120ms ease',
          '&:hover': {
            transform: 'scale(1.04)',
            boxShadow: 'inset 0 0 0 1px currentColor',
          },
          '&[aria-pressed="true"], &[aria-selected="true"]': {
            boxShadow: 'inset 0 0 0 2px currentColor',
            backgroundColor: 'rgba(255,255,255,0.08)',
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: PALETTE.primary.light,
          textDecoration: 'underline', // Crucial for color-blind users (Use of Color rule)
          textUnderlineOffset: '4px',
          '&:hover': { color: PALETTE.primary.main },
          '&:focus-visible': {
            ...FOCUS_RING,
            borderRadius: '2px',
          },
        },
      },
    },

    // 3. FORMS & INPUTS (Labels, Borders, Errors)
    MuiInputBase: {
      styleOverrides: {
        input: {
          minHeight: 44, // Touch target safety
          '&::placeholder': {
            opacity: 1,
            color: '#bdbdbd', // AAA 7:1 on #121212 (was #a0a0a0)
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: PALETTE.primary.light,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: PALETTE.primary.main,
            borderWidth: 2,
          },
        },
        notchedOutline: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#e8e8e8', // AAA 7:1 label
          '&.Mui-focused': { color: PALETTE.primary.main },
        },
        // MERGE: Nick's Asterisk Style (Mapped to OUR Palette)
        asterisk: {
          color: PALETTE.error.main,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        asterisk: {
          color: PALETTE.error.main,
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem', // Ensure error text isn't microscopic
          color: '#e8e8e8', // AAA 7:1
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: 10, // Expand touch target
          '&:focus-visible': FOCUS_RING,
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: 10,
          '&:focus-visible': FOCUS_RING,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&:focus-visible': FOCUS_RING,
        },
        track: {
          opacity: 0.5,
          backgroundColor: '#9e9e9e',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: '#e8e8e8' },
      },
    },

    // 4. SURFACES (Cards, Dialogs, Menus)
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.12)', // Visual definition for low vision
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 48, // WCAG Touch Target
          transition:
            'background-color 120ms ease, transform 120ms ease, box-shadow 120ms ease',
          '&:focus-visible': {
            backgroundColor: alpha(PALETTE.primary.main, 0.16),
            boxShadow: 'inset 3px 0 0 currentColor',
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow: 'inset 3px 0 0 currentColor',
            transform: 'translateX(1px)',
          },
          '&.Mui-selected': {
            fontWeight: 700,
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            boxShadow: 'inset 3px 0 0 currentColor',
          },
        },
      },
    },

    // 5. DATA DISPLAY (Chips, Tables, Alerts)
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          height: 32,
          borderWidth: 2,
          transition:
            'color 120ms ease, background-color 120ms ease, transform 120ms ease, box-shadow 120ms ease',
          '&:focus-visible': FOCUS_RING,
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: 'inset 0 0 0 1px currentColor',
          },
          '&[aria-pressed="true"], &.MuiChip-filled': {
            boxShadow: 'inset 0 0 0 2px currentColor',
          },
        },
        label: { fontWeight: 500 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.95rem', // Readable alerts
          alignItems: 'center',
        },
        standardError: {
          backgroundColor: alpha(PALETTE.error.main, 0.12),
          color: '#ffd6d6',
          border: `1px solid ${PALETTE.error.main}`,
        },
        standardInfo: {
          backgroundColor: alpha(PALETTE.info.main, 0.12),
          color: '#d9ffff',
          border: `1px solid ${PALETTE.info.main}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 48,
          fontSize: '1rem',
          borderBottom: '3px solid transparent',
          '&:focus-visible': FOCUS_RING,
          '&.Mui-selected': {
            fontWeight: 800,
            textDecoration: 'underline',
            textUnderlineOffset: '5px',
            borderBottomColor: PALETTE.primary.main,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 4,
          borderRadius: 999,
          backgroundColor: PALETTE.primary.light,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            fontWeight: 800,
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            borderWidth: 2,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: FONT_FAMILY,
          backgroundColor: '#424242',
          color: '#ffffff',
          fontSize: '0.875rem',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      },
    },

    // 6. MERGE: Nick's Stepper Logic (Updated to use OUR Palette)
    // Signup stepper readability on dark background
    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: 'rgba(255,255,255,0.92)', // AAA 7:1 on dark (was 0.70)
          '&.Mui-active': {
            color: '#ffffff',
            fontWeight: 700,
          },
          '&.Mui-completed': {
            color: 'rgba(255,255,255,0.97)',
            fontWeight: 600,
          },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.55)', // AAA: slightly stronger inactive icon (was 0.35)
          '&.Mui-active': {
            color: PALETTE.primary.main, // Mapped to our Blue
          },
          '&.Mui-completed': {
            color: PALETTE.success.main, // Mapped to our Green
          },
        },
        text: {
          fill: '#121212', // Matches our Background Dark
          fontWeight: 800,
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: {
          borderColor: 'rgba(255,255,255,0.18)',
        },
      },
    },
  },
});

export default theme;
export { FONT_FAMILY };
